//! Microphone recording for voice capture and dictation.
//!
//! A recording runs on its own thread (it owns the cpal input stream) until
//! `Recording::finish` stops it. The audio is mixed down to mono, resampled to
//! 16 kHz (what Whisper uses), checked for actual speech, and encoded as a
//! 16-bit PCM WAV for upload. Nothing is written to disk.

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

/// Sample rate sent to Whisper.
pub const TARGET_RATE: u32 = 16_000;
/// Safety cap so a stuck key cannot record forever.
const MAX_SECONDS: u64 = 120;
/// Shorter takes are almost always an accidental tap.
const MIN_SECONDS: f32 = 0.35;
/// Quieter than this (loudest 30 ms window) counts as silence. Whisper tends
/// to invent words like "Thank you." for silent clips, so they never reach it.
const SILENCE_DBFS: f32 = -50.0;

const MIC_HELP: &str = "Check that a microphone is connected and that Windows Settings > Privacy & security > Microphone allows desktop apps.";

/// Mono audio as recorded.
pub struct Captured {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
}

/// An in-progress recording. Dropping it without `finish` leaves the thread
/// to stop at the time cap; always call `finish`.
pub struct Recording {
    stop: Arc<AtomicBool>,
    handle: JoinHandle<Result<Captured, String>>,
}

impl Recording {
    /// Stops the microphone and returns what was recorded. Blocks briefly.
    pub fn finish(self) -> Result<Captured, String> {
        self.stop.store(true, Ordering::SeqCst);
        self.handle
            .join()
            .map_err(|_| "The recording thread stopped unexpectedly.".to_string())?
    }
}

/// Opens the default microphone and starts recording. Returns once audio is
/// flowing, or with a readable error.
pub fn start() -> Result<Recording, String> {
    let stop = Arc::new(AtomicBool::new(false));
    let (ready_tx, ready_rx) = mpsc::channel::<Result<(), String>>();
    let thread_stop = Arc::clone(&stop);
    let handle = thread::spawn(move || record(thread_stop, ready_tx));

    match ready_rx.recv_timeout(Duration::from_secs(5)) {
        Ok(Ok(())) => Ok(Recording { stop, handle }),
        Ok(Err(e)) => {
            let _ = handle.join();
            Err(e)
        }
        Err(_) => {
            stop.store(true, Ordering::SeqCst);
            Err(format!("The microphone did not start. {}", MIC_HELP))
        }
    }
}

fn push(buffer: &Arc<Mutex<Vec<f32>>>, samples: impl Iterator<Item = f32>) {
    if let Ok(mut b) = buffer.lock() {
        b.extend(samples);
    }
}

fn record(stop: Arc<AtomicBool>, ready: mpsc::Sender<Result<(), String>>) -> Result<Captured, String> {
    let fail = |message: String| -> Result<Captured, String> {
        let _ = ready.send(Err(message.clone()));
        Err(message)
    };

    let host = cpal::default_host();
    let device = match host.default_input_device() {
        Some(d) => d,
        None => return fail(format!("No microphone found. {}", MIC_HELP)),
    };
    let supported = match device.default_input_config() {
        Ok(c) => c,
        Err(e) => return fail(format!("Could not open the microphone ({}). {}", e, MIC_HELP)),
    };

    let channels = supported.channels() as usize;
    let sample_rate = supported.sample_rate();
    let format = supported.sample_format();
    let config: cpal::StreamConfig = supported.config();
    let buffer: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));

    let built = match format {
        cpal::SampleFormat::F32 => {
            let buf = Arc::clone(&buffer);
            device.build_input_stream(
                config.clone(),
                move |data: &[f32], _: &cpal::InputCallbackInfo| push(&buf, data.iter().copied()),
                |e| eprintln!("Microphone stream error: {}", e),
                None,
            )
        }
        cpal::SampleFormat::I16 => {
            let buf = Arc::clone(&buffer);
            device.build_input_stream(
                config.clone(),
                move |data: &[i16], _: &cpal::InputCallbackInfo| push(&buf, data.iter().map(|&s| s as f32 / 32_768.0)),
                |e| eprintln!("Microphone stream error: {}", e),
                None,
            )
        }
        cpal::SampleFormat::I32 => {
            let buf = Arc::clone(&buffer);
            device.build_input_stream(
                config.clone(),
                move |data: &[i32], _: &cpal::InputCallbackInfo| push(&buf, data.iter().map(|&s| s as f32 / 2_147_483_648.0)),
                |e| eprintln!("Microphone stream error: {}", e),
                None,
            )
        }
        cpal::SampleFormat::U16 => {
            let buf = Arc::clone(&buffer);
            device.build_input_stream(
                config.clone(),
                move |data: &[u16], _: &cpal::InputCallbackInfo| push(&buf, data.iter().map(|&s| (s as f32 - 32_768.0) / 32_768.0)),
                |e| eprintln!("Microphone stream error: {}", e),
                None,
            )
        }
        other => return fail(format!("This microphone uses an unsupported sample format ({:?}).", other)),
    };

    let stream = match built {
        Ok(s) => s,
        Err(e) => return fail(format!("Could not start the microphone ({}). {}", e, MIC_HELP)),
    };
    if let Err(e) = stream.play() {
        return fail(format!("Could not start the microphone ({}). {}", e, MIC_HELP));
    }
    let _ = ready.send(Ok(()));

    let started = Instant::now();
    while !stop.load(Ordering::SeqCst) && started.elapsed() < Duration::from_secs(MAX_SECONDS) {
        thread::sleep(Duration::from_millis(15));
    }
    drop(stream);

    let interleaved = {
        let mut b = buffer.lock().map_err(|_| "The recording buffer was lost.".to_string())?;
        std::mem::take(&mut *b)
    };
    Ok(Captured { samples: downmix(&interleaved, channels), sample_rate })
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

/// Resamples by averaging each output sample's window (a box filter), which
/// also removes most of the high frequencies that would otherwise alias.
pub fn resample(samples: &[f32], from: u32, to: u32) -> Vec<f32> {
    if from == to || samples.is_empty() || from == 0 || to == 0 {
        return samples.to_vec();
    }
    let ratio = from as f64 / to as f64;
    let out_len = (samples.len() as f64 / ratio).floor() as usize;
    (0..out_len)
        .map(|i| {
            let start = (i as f64 * ratio) as usize;
            let end = (((i + 1) as f64 * ratio) as usize).min(samples.len()).max(start + 1);
            samples[start..end].iter().sum::<f32>() / (end - start) as f32
        })
        .collect()
}

pub fn duration_secs(samples: &[f32], rate: u32) -> f32 {
    if rate == 0 {
        return 0.0;
    }
    samples.len() as f32 / rate as f32
}

/// Level of the loudest 30 ms window, in dBFS (0 = full scale).
pub fn peak_window_dbfs(samples: &[f32], rate: u32) -> f32 {
    let window = ((rate as usize) * 30 / 1000).max(1);
    let loudest = samples
        .chunks(window)
        .map(|w| (w.iter().map(|s| s * s).sum::<f32>() / w.len() as f32).sqrt())
        .fold(0.0_f32, f32::max);
    if loudest <= 0.0 {
        f32::NEG_INFINITY
    } else {
        20.0 * loudest.log10()
    }
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
    let mono16k = resample(&captured.samples, captured.sample_rate, TARGET_RATE);
    check_speech(&mono16k, TARGET_RATE)?;
    Ok(encode_wav(&mono16k, TARGET_RATE))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tone(seconds: f32, rate: u32, amplitude: f32) -> Vec<f32> {
        let n = (seconds * rate as f32) as usize;
        (0..n)
            .map(|i| amplitude * (2.0 * std::f32::consts::PI * 220.0 * i as f32 / rate as f32).sin())
            .collect()
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
        assert!(out.iter().all(|s| (s - 0.25).abs() < 1e-6));
        assert_eq!(resample(&one_second, 16_000, 16_000).len(), 48_000);
        assert_eq!(resample(&vec![0.0; 44_100], 44_100, 16_000).len(), 16_000);
    }

    #[test]
    fn rejects_short_and_silent_takes() {
        assert!(check_speech(&tone(0.2, 16_000, 0.3), 16_000).unwrap_err().contains("Too short"));
        assert!(check_speech(&vec![0.0; 16_000], 16_000).unwrap_err().contains("No speech"));
        assert!(check_speech(&tone(1.0, 16_000, 0.0005), 16_000).unwrap_err().contains("No speech"));
        assert!(check_speech(&tone(1.0, 16_000, 0.2), 16_000).is_ok());
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
}
