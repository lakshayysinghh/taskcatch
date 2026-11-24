//! Microphone recording for voice capture and dictation.
//!
//! The microphone is opened once, on a dedicated audio thread, and kept
//! paused between takes. Starting a take is then just "unpause", so the first
//! word is not lost while Windows opens the device (which can take most of a
//! second). After each take the stream is reopened in the background, which
//! also picks up a microphone that was plugged in or made the default since.
//!
//! A finished take is cleaned up for Whisper: mixed to mono, resampled to
//! 16 kHz with a proper low-pass filter, stripped of low rumble, trimmed of
//! long leading and trailing silence, and raised to a consistent loudness.
//! Nothing is written to disk.

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{mpsc, Arc, Mutex, OnceLock};
use std::thread;
use std::time::Duration;

/// Sample rate sent to Whisper (its native rate).
pub const TARGET_RATE: u32 = 16_000;
/// Safety cap so a stuck key cannot record forever.
const MAX_SECONDS: usize = 120;
/// Shorter takes are almost always an accidental tap.
const MIN_SECONDS: f32 = 0.35;
/// Quieter than this (loudest 30 ms window, before any gain) counts as
/// silence. Whisper tends to invent words like "Thank you." for silent clips,
/// so they never reach it.
const SILENCE_DBFS: f32 = -50.0;
/// Keep listening this long after the key is released: people let go while
/// the last syllable is still coming out.
const TAIL: Duration = Duration::from_millis(300);
/// Removes desk thumps, fan hum and DC offset; below the lowest voice pitch.
const HIGH_PASS_HZ: f32 = 80.0;
/// Loudness goal for the loudest 30 ms window. Whisper is noticeably less
/// accurate on quiet input.
const TARGET_LOUDNESS_DBFS: f32 = -18.0;
/// Never boost a sample above this, so the boost cannot clip.
const PEAK_CEILING_DBFS: f32 = -1.0;
/// At most +26 dB, so near-silence is not blown up into hiss.
const MAX_GAIN: f32 = 20.0;
/// Silence kept before the first and after the last spoken sound.
const TRIM_PAD_SECONDS: f32 = 0.3;
/// Windows this far below the loudest one count as silence when trimming.
const TRIM_RANGE_DB: f32 = 35.0;
/// Width of the resampling filter, in zero crossings each side.
const RESAMPLE_ZEROS: f64 = 16.0;

const MIC_HELP: &str = "Check that a microphone is connected and that Windows Settings > Privacy & security > Microphone allows desktop apps.";

/// Mono audio as recorded.
pub struct Captured {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
}

// ---------------------------------------------------------------------------
// Audio thread
// ---------------------------------------------------------------------------

/// State shared between the audio callback and the audio thread.
#[derive(Default)]
struct Shared {
    /// The callback only keeps samples while this is set.
    recording: AtomicBool,
    /// Set by the stream's error callback (for example, the mic was unplugged).
    failed: AtomicBool,
    /// Most interleaved samples to keep (the time cap).
    limit: AtomicUsize,
    samples: Mutex<Vec<f32>>,
}

struct Mic {
    stream: cpal::Stream,
    channels: usize,
    rate: u32,
}

enum Command {
    Prewarm,
    Start(mpsc::Sender<Result<(), String>>),
    Stop { tail: Duration, reply: Option<mpsc::Sender<Result<Captured, String>>> },
}

/// The audio thread owns the cpal stream for the life of the app.
fn engine() -> mpsc::Sender<Command> {
    static ENGINE: OnceLock<Mutex<mpsc::Sender<Command>>> = OnceLock::new();
    let sender = ENGINE.get_or_init(|| {
        let (tx, rx) = mpsc::channel();
        thread::Builder::new()
            .name("taskcatch-microphone".to_string())
            .spawn(move || audio_thread(rx))
            .expect("could not start the audio thread");
        Mutex::new(tx)
    });
    sender.lock().unwrap_or_else(|p| p.into_inner()).clone()
}

/// Opens the microphone in the background so the first take starts instantly.
/// Failures are ignored here; they are reported when a take starts.
pub fn prewarm() {
    let _ = engine().send(Command::Prewarm);
}

fn shared() -> &'static Arc<Shared> {
    static SHARED: OnceLock<Arc<Shared>> = OnceLock::new();
    SHARED.get_or_init(|| Arc::new(Shared::default()))
}

/// Samples used for the live level: about the last 50 ms.
const LEVEL_SAMPLES: usize = 2_400;

/// Current microphone level while recording, from 0 (silence, -60 dBFS or
/// less) to 1 (-10 dBFS or more). 0 when not recording. Cheap enough to
/// call 20 times a second for the on-screen meter.
pub fn input_level() -> f32 {
    let s = shared();
    if !s.recording.load(Ordering::Acquire) {
        return 0.0;
    }
    let buffer = match s.samples.lock() {
        Ok(b) => b,
        Err(_) => return 0.0,
    };
    let n = buffer.len().min(LEVEL_SAMPLES);
    if n == 0 {
        return 0.0;
    }
    let tail = &buffer[buffer.len() - n..];
    let rms = (tail.iter().map(|x| x * x).sum::<f32>() / n as f32).sqrt();
    level_from_rms(rms)
}

/// Maps an RMS amplitude to a 0..1 meter level on a -60..-10 dBFS scale.
pub fn level_from_rms(rms: f32) -> f32 {
    if rms <= 0.0 {
        return 0.0;
    }
    ((20.0 * rms.log10() + 60.0) / 50.0).clamp(0.0, 1.0)
}

fn audio_thread(rx: mpsc::Receiver<Command>) {
    let shared = Arc::clone(shared());
    let mut mic: Option<Mic> = None;
    while let Ok(command) = rx.recv() {
        match command {
            Command::Prewarm => {
                if mic.is_none() {
                    mic = open_mic(&shared).ok();
                }
            }
            Command::Start(reply) => {
                let _ = reply.send(begin(&mut mic, &shared));
            }
            Command::Stop { tail, reply } => {
                thread::sleep(tail);
                let captured = end(&mic, &shared);
                if let Some(reply) = reply {
                    let _ = reply.send(captured);
                }
                // Reopen for the next take: picks up a changed default
                // microphone and keeps the next press instant.
                drop(mic.take());
                mic = open_mic(&shared).ok();
            }
        }
    }
}

fn begin(mic: &mut Option<Mic>, shared: &Arc<Shared>) -> Result<(), String> {
    if shared.failed.swap(false, Ordering::SeqCst) {
        *mic = None;
    }
    for attempt in 0..2 {
        if mic.is_none() {
            *mic = Some(open_mic(shared)?);
        }
        let m = mic.as_ref().expect("opened above");
        if let Ok(mut buffer) = shared.samples.lock() {
            buffer.clear();
        }
        shared.limit.store(MAX_SECONDS * m.rate as usize * m.channels, Ordering::SeqCst);
        shared.recording.store(true, Ordering::SeqCst);
        let played = m.stream.play();
        match played {
            Ok(()) => return Ok(()),
            Err(e) => {
                shared.recording.store(false, Ordering::SeqCst);
                *mic = None; // the device may have gone away; reopen once
                if attempt == 1 {
                    return Err(format!("Could not start the microphone ({}). {}", e, MIC_HELP));
                }
            }
        }
    }
    Err(format!("Could not start the microphone. {}", MIC_HELP))
}

fn end(mic: &Option<Mic>, shared: &Shared) -> Result<Captured, String> {
    shared.recording.store(false, Ordering::SeqCst);
    let m = mic.as_ref().ok_or_else(|| format!("The microphone was not recording. {}", MIC_HELP))?;
    let _ = m.stream.pause();
    let interleaved = {
        let mut buffer = shared.samples.lock().map_err(|_| "The recording buffer was lost.".to_string())?;
        std::mem::take(&mut *buffer)
    };
    if interleaved.is_empty() && shared.failed.load(Ordering::SeqCst) {
        return Err(format!("The microphone stopped working during the recording. {}", MIC_HELP));
    }
    Ok(Captured { samples: downmix(&interleaved, m.channels), sample_rate: m.rate })
}

fn push(shared: &Shared, samples: impl Iterator<Item = f32>) {
    if !shared.recording.load(Ordering::Acquire) {
        return;
    }
    if let Ok(mut buffer) = shared.samples.lock() {
        let room = shared.limit.load(Ordering::Relaxed).saturating_sub(buffer.len());
        buffer.extend(samples.take(room));
    }
}

fn build<T, F>(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    shared: &Arc<Shared>,
    convert: F,
) -> Result<cpal::Stream, String>
where
    T: cpal::SizedSample + Send + 'static,
    F: Fn(T) -> f32 + Send + 'static,
{
    let data_shared = Arc::clone(shared);
    let error_shared = Arc::clone(shared);
    device.build_input_stream(
        config.clone(),
        move |data: &[T], _: &cpal::InputCallbackInfo| push(&data_shared, data.iter().map(|&s| convert(s))),
        move |e| {
            eprintln!("Microphone stream error: {}", e);
            error_shared.failed.store(true, Ordering::SeqCst);
        },
        None,
    )
    .map_err(|e| e.to_string())
}

/// Opens the default microphone, starts it once to finish Windows' slow
/// set-up, and leaves it paused.
fn open_mic(shared: &Arc<Shared>) -> Result<Mic, String> {
    shared.failed.store(false, Ordering::SeqCst);
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| format!("No microphone found. {}", MIC_HELP))?;
    let supported = device
        .default_input_config()
        .map_err(|e| format!("Could not open the microphone ({}). {}", e, MIC_HELP))?;

    let channels = supported.channels() as usize;
    let rate = supported.sample_rate();
    let format = supported.sample_format();
    let config: cpal::StreamConfig = supported.config();

    let built = match format {
        cpal::SampleFormat::F32 => build::<f32, _>(&device, &config, shared, |s| s),
        cpal::SampleFormat::I16 => build::<i16, _>(&device, &config, shared, |s| s as f32 / 32_768.0),
        cpal::SampleFormat::I32 => build::<i32, _>(&device, &config, shared, |s| s as f32 / 2_147_483_648.0),
        cpal::SampleFormat::U16 => build::<u16, _>(&device, &config, shared, |s| (s as f32 - 32_768.0) / 32_768.0),
        other => return Err(format!("This microphone uses an unsupported sample format ({:?}).", other)),
    };
    let stream = built.map_err(|e| format!("Could not open the microphone ({}). {}", e, MIC_HELP))?;
    stream
        .play()
        .map_err(|e| format!("Could not start the microphone ({}). {}", e, MIC_HELP))?;
    let _ = stream.pause();
    Ok(Mic { stream, channels: channels.max(1), rate })
}

// ---------------------------------------------------------------------------
// Public recording API
// ---------------------------------------------------------------------------

/// An in-progress recording. Call `finish` to keep it or `discard` to drop
/// it; dropping it without either discards it.
pub struct Recording {
    sender: Option<mpsc::Sender<Command>>,
}

impl Recording {
    /// Keeps listening briefly (so the last word is not clipped), stops the
    /// microphone and returns what was recorded. Blocks for about 0.3 s.
    pub fn finish(mut self) -> Result<Captured, String> {
        self.stop(TAIL)
    }

    /// Stops immediately and throws the audio away.
    pub fn discard(mut self) {
        let _ = self.stop(Duration::ZERO);
    }

    fn stop(&mut self, tail: Duration) -> Result<Captured, String> {
        let sender = self.sender.take().ok_or_else(|| "Not recording.".to_string())?;
        let (tx, rx) = mpsc::channel();
        sender
            .send(Command::Stop { tail, reply: Some(tx) })
            .map_err(|_| "The audio thread stopped unexpectedly.".to_string())?;
        rx.recv_timeout(tail + Duration::from_secs(5))
            .map_err(|_| "The microphone did not stop in time.".to_string())?
    }
}

impl Drop for Recording {
    fn drop(&mut self) {
        if let Some(sender) = self.sender.take() {
            let _ = sender.send(Command::Stop { tail: Duration::ZERO, reply: None });
        }
    }
}

/// Starts recording from the default microphone. Returns once audio is
/// flowing, or with a readable error.
pub fn start() -> Result<Recording, String> {
    let sender = engine();
    let (tx, rx) = mpsc::channel();
    sender
        .send(Command::Start(tx))
        .map_err(|_| "The audio thread stopped unexpectedly.".to_string())?;
    match rx.recv_timeout(Duration::from_secs(5)) {
        Ok(Ok(())) => Ok(Recording { sender: Some(sender) }),
        Ok(Err(e)) => Err(e),
        Err(_) => {
            // It may still start later; make sure it is stopped again.
            let _ = sender.send(Command::Stop { tail: Duration::ZERO, reply: None });
            Err(format!("The microphone did not start. {}", MIC_HELP))
        }
    }
}

// ---------------------------------------------------------------------------
// Pure audio helpers (unit-tested)
// ---------------------------------------------------------------------------

/// Averages interleaved channels into one.
pub fn downmix(interleaved: &[f32], channels: usize) -> Vec<f32> {
    if channels <= 1 {
        return interleaved.to_vec();
    }
    interleaved
        .chunks(channels)
        .map(|frame| frame.iter().sum::<f32>() / frame.len() as f32)
        .collect()
}

fn sinc(x: f64) -> f64 {
    if x.abs() < 1e-9 {
        1.0
    } else {
        let px = std::f64::consts::PI * x;
        px.sin() / px
    }
}

/// Blackman window over t in [-1, 1].
fn blackman(t: f64) -> f64 {
    if t.abs() >= 1.0 {
        return 0.0;
    }
    let pi = std::f64::consts::PI;
    0.42 + 0.5 * (pi * t).cos() + 0.08 * (2.0 * pi * t).cos()
}

/// Band-limited resampling with a Blackman-windowed sinc filter. When
/// downsampling, everything above the new Nyquist frequency is filtered out
/// first, so it cannot fold back into the speech band as noise.
pub fn resample(samples: &[f32], from: u32, to: u32) -> Vec<f32> {
    if from == to || samples.is_empty() || from == 0 || to == 0 {
        return samples.to_vec();
    }
    let step = from as f64 / to as f64; // input samples per output sample
    let scale = (to as f64 / from as f64).min(1.0);
    let cutoff = 0.5 * scale * 0.94; // cycles per input sample, just under Nyquist
    let half = (RESAMPLE_ZEROS / scale).ceil() as isize;
    let reach = half as f64 + 1.0;
    let last_index = samples.len() as isize - 1;
    let out_len = (samples.len() as f64 / step).floor() as usize;

    let mut out = Vec::with_capacity(out_len);
    for i in 0..out_len {
        let center = i as f64 * step;
        let base = center.floor() as isize;
        let mut acc = 0.0f64;
        let mut weight_sum = 0.0f64;
        for j in (base - half).max(0)..=(base + half).min(last_index) {
            let x = j as f64 - center;
            let w = sinc(2.0 * cutoff * x) * blackman(x / reach);
            acc += samples[j as usize] as f64 * w;
            weight_sum += w;
        }
        out.push(if weight_sum.abs() > 1e-9 { (acc / weight_sum) as f32 } else { 0.0 });
    }
    out
}

/// Second-order Butterworth high-pass filter (Audio EQ Cookbook biquad).
pub fn high_pass(samples: &[f32], rate: u32, cutoff_hz: f32) -> Vec<f32> {
    if samples.is_empty() || rate == 0 || cutoff_hz <= 0.0 || cutoff_hz >= rate as f32 / 2.0 {
        return samples.to_vec();
    }
    let w0 = 2.0 * std::f64::consts::PI * cutoff_hz as f64 / rate as f64;
    let alpha = w0.sin() / (2.0 * std::f64::consts::FRAC_1_SQRT_2);
    let cos_w0 = w0.cos();
    let a0 = 1.0 + alpha;
    let b0 = (1.0 + cos_w0) / 2.0 / a0;
    let b1 = -(1.0 + cos_w0) / a0;
    let b2 = b0;
    let a1 = -2.0 * cos_w0 / a0;
    let a2 = (1.0 - alpha) / a0;

    let (mut x1, mut x2, mut y1, mut y2) = (0.0f64, 0.0f64, 0.0f64, 0.0f64);
    samples
        .iter()
        .map(|&s| {
            let x0 = s as f64;
            let y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
            x2 = x1;
            x1 = x0;
            y2 = y1;
            y1 = y0;
            y0 as f32
        })
        .collect()
}

pub fn duration_secs(samples: &[f32], rate: u32) -> f32 {
    if rate == 0 {
        return 0.0;
    }
    samples.len() as f32 / rate as f32
}

fn rms_dbfs(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return f32::NEG_INFINITY;
    }
    let mean_square = samples.iter().map(|&s| (s as f64) * (s as f64)).sum::<f64>() / samples.len() as f64;
    if mean_square <= 0.0 {
        f32::NEG_INFINITY
    } else {
        (10.0 * mean_square.log10()) as f32
    }
}

/// Levels (dBFS) of overlapping 30 ms windows, 10 ms apart.
/// Returns (window length, hop, levels).
fn window_levels(samples: &[f32], rate: u32) -> (usize, usize, Vec<f32>) {
    let window = ((rate as usize) * 30 / 1000).max(1);
    let hop = ((rate as usize) * 10 / 1000).max(1);
    if samples.len() <= window {
        return (window, hop, vec![rms_dbfs(samples)]);
    }
    let mut levels = Vec::with_capacity(samples.len() / hop + 1);
    let mut start = 0;
    while start + window <= samples.len() {
        levels.push(rms_dbfs(&samples[start..start + window]));
        start += hop;
    }
    (window, hop, levels)
}

/// Level of the loudest 30 ms window, in dBFS (0 = full scale).
pub fn peak_window_dbfs(samples: &[f32], rate: u32) -> f32 {
    window_levels(samples, rate).2.into_iter().fold(f32::NEG_INFINITY, f32::max)
}

/// Rejects takes that are too short or silent, with a message for the user.
pub fn check_speech(samples: &[f32], rate: u32) -> Result<(), String> {
    if duration_secs(samples, rate) < MIN_SECONDS {
        return Err("Too short — hold the key while you speak.".to_string());
    }
    if peak_window_dbfs(samples, rate) < SILENCE_DBFS {
        return Err(format!("No speech detected. {}", MIC_HELP));
    }
    Ok(())
}

/// Cuts long silence before the first and after the last sound, keeping a
/// short pad. Pauses in the middle are left alone. Long silent stretches are
/// where Whisper invents text.
pub fn trim_silence(samples: &[f32], rate: u32) -> Vec<f32> {
    let (window, hop, levels) = window_levels(samples, rate);
    let loudest = levels.iter().copied().fold(f32::NEG_INFINITY, f32::max);
    if !loudest.is_finite() {
        return samples.to_vec();
    }
    let threshold = (loudest - TRIM_RANGE_DB).max(SILENCE_DBFS);
    let first = levels.iter().position(|&l| l >= threshold);
    let last = levels.iter().rposition(|&l| l >= threshold);
    let (first, last) = match (first, last) {
        (Some(f), Some(l)) => (f, l),
        _ => return samples.to_vec(),
    };
    let pad = (TRIM_PAD_SECONDS * rate as f32) as usize;
    let start = (first * hop).saturating_sub(pad);
    let end = (last * hop + window + pad).min(samples.len());
    samples[start..end].to_vec()
}

fn db_to_gain(db: f32) -> f32 {
    10f32.powf(db / 20.0)
}

/// Raises quiet speech so its loudest 30 ms window reaches the target
/// loudness, without letting any sample go above the peak ceiling. Only ever
/// boosts; loud recordings are left as they are.
pub fn normalize_loudness(samples: &[f32], rate: u32) -> Vec<f32> {
    let peak = samples.iter().fold(0.0f32, |m, s| m.max(s.abs()));
    let loudest = peak_window_dbfs(samples, rate);
    if peak <= 0.0 || !loudest.is_finite() {
        return samples.to_vec();
    }
    let wanted = db_to_gain(TARGET_LOUDNESS_DBFS - loudest);
    let ceiling = db_to_gain(PEAK_CEILING_DBFS) / peak;
    let gain = wanted.min(ceiling).min(MAX_GAIN).max(1.0);
    if gain <= 1.01 {
        return samples.to_vec();
    }
    samples.iter().map(|&s| (s * gain).clamp(-1.0, 1.0)).collect()
}

/// 16-bit PCM mono WAV.
pub fn encode_wav(samples: &[f32], rate: u32) -> Vec<u8> {
    let data_len = (samples.len() * 2) as u32;
    let mut out = Vec::with_capacity(44 + data_len as usize);
    out.extend_from_slice(b"RIFF");
    out.extend_from_slice(&(36 + data_len).to_le_bytes());
    out.extend_from_slice(b"WAVE");
    out.extend_from_slice(b"fmt ");
    out.extend_from_slice(&16u32.to_le_bytes()); // fmt chunk size
    out.extend_from_slice(&1u16.to_le_bytes()); // PCM
    out.extend_from_slice(&1u16.to_le_bytes()); // mono
    out.extend_from_slice(&rate.to_le_bytes());
    out.extend_from_slice(&(rate * 2).to_le_bytes()); // byte rate
    out.extend_from_slice(&2u16.to_le_bytes()); // block align
    out.extend_from_slice(&16u16.to_le_bytes()); // bits per sample
    out.extend_from_slice(b"data");
    out.extend_from_slice(&data_len.to_le_bytes());
    for s in samples {
        let v = (s.clamp(-1.0, 1.0) * 32_767.0).round() as i16;
        out.extend_from_slice(&v.to_le_bytes());
    }
    out
}

/// Turns a recording into a WAV ready for Whisper, or explains why not.
pub fn prepare_wav(captured: Captured) -> Result<Vec<u8>, String> {
    let mono = resample(&captured.samples, captured.sample_rate, TARGET_RATE);
    let filtered = high_pass(&mono, TARGET_RATE, HIGH_PASS_HZ);
    // The silence check looks at the level before any boost.
    check_speech(&filtered, TARGET_RATE)?;
    let trimmed = trim_silence(&filtered, TARGET_RATE);
    let leveled = normalize_loudness(&trimmed, TARGET_RATE);
    Ok(encode_wav(&leveled, TARGET_RATE))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sine(seconds: f32, rate: u32, freq: f32, amplitude: f32) -> Vec<f32> {
        let n = (seconds * rate as f32) as usize;
        (0..n)
            .map(|i| amplitude * (2.0 * std::f32::consts::PI * freq * i as f32 / rate as f32).sin())
            .collect()
    }

    fn tone(seconds: f32, rate: u32, amplitude: f32) -> Vec<f32> {
        sine(seconds, rate, 220.0, amplitude)
    }

    fn rms(samples: &[f32]) -> f32 {
        (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt()
    }

    #[test]
    fn meter_level_scale() {
        assert_eq!(level_from_rms(0.0), 0.0);
        assert_eq!(level_from_rms(0.0005), 0.0); // about -66 dBFS
        assert!((level_from_rms(0.01) - 0.4).abs() < 0.01); // -40 dBFS
        assert_eq!(level_from_rms(0.5), 1.0);
        assert_eq!(input_level(), 0.0); // not recording
    }

    #[test]
    fn downmix_averages_channels() {
        assert_eq!(downmix(&[1.0, 0.0, 0.5, 0.5], 2), vec![0.5, 0.5]);
        assert_eq!(downmix(&[0.1, 0.2], 1), vec![0.1, 0.2]);
    }

    #[test]
    fn resample_changes_length_by_ratio() {
        let one_second = vec![0.25_f32; 48_000];
        let out = resample(&one_second, 48_000, 16_000);
        assert_eq!(out.len(), 16_000);
        assert!(out.iter().all(|s| (s - 0.25).abs() < 1e-4));
        assert_eq!(resample(&one_second, 16_000, 16_000).len(), 48_000);
        assert_eq!(resample(&vec![0.0; 44_100], 44_100, 16_000).len(), 16_000);
    }

    #[test]
    fn resample_keeps_speech_and_removes_what_would_alias() {
        // 1 kHz is speech band: kept at full level.
        let speech = resample(&sine(1.0, 48_000, 1_000.0, 0.5), 48_000, 16_000);
        let kept = rms(&speech[1_000..15_000]);
        assert!((kept - 0.5 / 2f32.sqrt()).abs() < 0.02, "1 kHz level {}", kept);

        // 12 kHz cannot exist at 16 kHz and would fold to 4 kHz: removed.
        let hiss = resample(&sine(1.0, 48_000, 12_000.0, 0.5), 48_000, 16_000);
        assert!(rms(&hiss[1_000..15_000]) < 0.005, "12 kHz leaked {}", rms(&hiss[1_000..15_000]));

        // Same from 44.1 kHz.
        let hiss = resample(&sine(1.0, 44_100, 11_000.0, 0.5), 44_100, 16_000);
        assert!(rms(&hiss[1_000..15_000]) < 0.005);
    }

    #[test]
    fn high_pass_removes_rumble_but_keeps_voice() {
        let rate = 16_000;
        let dc: Vec<f32> = vec![0.3; rate as usize];
        let out = high_pass(&dc, rate, HIGH_PASS_HZ);
        assert!(out[8_000..].iter().all(|s| s.abs() < 0.001));

        let hum = high_pass(&sine(1.0, rate, 20.0, 0.5), rate, HIGH_PASS_HZ);
        assert!(rms(&hum[8_000..]) < 0.05);

        let voice = high_pass(&sine(1.0, rate, 1_000.0, 0.5), rate, HIGH_PASS_HZ);
        assert!((rms(&voice[8_000..]) - 0.5 / 2f32.sqrt()).abs() < 0.01);
    }

    #[test]
    fn rejects_short_and_silent_takes() {
        assert!(check_speech(&tone(0.2, 16_000, 0.3), 16_000).unwrap_err().contains("Too short"));
        assert!(check_speech(&vec![0.0; 16_000], 16_000).unwrap_err().contains("No speech"));
        assert!(check_speech(&tone(1.0, 16_000, 0.0005), 16_000).unwrap_err().contains("No speech"));
        assert!(check_speech(&tone(1.0, 16_000, 0.2), 16_000).is_ok());
    }

    #[test]
    fn trims_long_silence_but_keeps_a_pad() {
        let rate = 16_000;
        let mut take = vec![0.0f32; rate as usize]; // 1 s silence
        take.extend(tone(0.5, rate, 0.3)); // 0.5 s speech
        take.extend(vec![0.0f32; rate as usize]); // 1 s silence
        let out = trim_silence(&take, rate);
        let seconds = duration_secs(&out, rate);
        assert!(seconds > 1.05 && seconds < 1.2, "kept {} s", seconds);

        // Pure silence is returned unchanged (the speech check rejects it).
        assert_eq!(trim_silence(&vec![0.0; 1_000], rate).len(), 1_000);
    }

    #[test]
    fn boosts_quiet_speech_and_leaves_loud_speech_alone() {
        let rate = 16_000;
        let quiet = tone(1.0, rate, 0.01); // about -43 dBFS
        let boosted = normalize_loudness(&quiet, rate);
        let level = peak_window_dbfs(&boosted, rate);
        assert!((level - TARGET_LOUDNESS_DBFS).abs() < 1.0, "boosted to {} dBFS", level);

        let loud = tone(1.0, rate, 0.5);
        assert_eq!(normalize_loudness(&loud, rate), loud);

        // A click in a quiet take cannot be pushed past the ceiling.
        let mut clicky = tone(1.0, rate, 0.01);
        clicky[100] = 0.5;
        let out = normalize_loudness(&clicky, rate);
        assert!(out.iter().all(|s| s.abs() <= db_to_gain(PEAK_CEILING_DBFS) + 1e-4));

        // Near-silence is boosted at most MAX_GAIN.
        let faint = tone(1.0, rate, 0.0001);
        let out = normalize_loudness(&faint, rate);
        assert!(out.iter().fold(0.0f32, |m, s| m.max(s.abs())) <= 0.0001 * MAX_GAIN + 1e-6);
    }

    #[test]
    fn wav_header_and_length_are_correct() {
        let wav = encode_wav(&[0.0, 1.0, -1.0], 16_000);
        assert_eq!(&wav[0..4], b"RIFF");
        assert_eq!(&wav[8..12], b"WAVE");
        assert_eq!(u32::from_le_bytes([wav[24], wav[25], wav[26], wav[27]]), 16_000);
        assert_eq!(u32::from_le_bytes([wav[40], wav[41], wav[42], wav[43]]), 6);
        assert_eq!(wav.len(), 44 + 6);
        assert_eq!(i16::from_le_bytes([wav[46], wav[47]]), 32_767);
        assert_eq!(i16::from_le_bytes([wav[48], wav[49]]), -32_767);
    }

    #[test]
    fn prepare_wav_resamples_to_16k() {
        let captured = Captured { samples: tone(1.0, 48_000, 0.3), sample_rate: 48_000 };
        let wav = prepare_wav(captured).unwrap();
        assert_eq!(wav.len(), 44 + 16_000 * 2);
    }

    #[test]
    fn prepare_wav_rejects_silence_before_boosting_it() {
        let captured = Captured { samples: tone(1.0, 48_000, 0.002), sample_rate: 48_000 };
        assert!(prepare_wav(captured).unwrap_err().contains("No speech"));
    }
}
