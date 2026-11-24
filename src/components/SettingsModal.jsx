import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, Bot, CheckCircle2, Keyboard, Loader2, Mic, Settings as SettingsIcon, Volume2 } from 'lucide-react';
import { isTauri, safeOpen as open, safeInvoke as invoke } from '../lib/tauri';
import { isSoundEnabled, setSoundEnabled as saveSoundPreference } from '../lib/prefs';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Label, Select, inputClass } from './ui/Field';

// The model the backend actually calls (MODEL in src-tauri/src/ai_client.rs).
const MODEL_LABEL = 'Llama 3.3 70B (llama-3.3-70b-versatile) on Groq';
const HOTKEY_PRESETS = ['F9', 'F10', 'CommandOrControl+Shift+T', 'Alt+Space'];
const VOICE_PRESETS = ['F8', 'F6', 'CommandOrControl+Shift+Space'];
const DICTATION_PRESETS = ['F7', 'F4', 'CommandOrControl+Shift+D'];

// ISO-639-1 codes Whisper accepts; empty = detect automatically.
const LANGUAGES = [
  ['', 'Detect automatically'],
  ['en', 'English'],
  ['hi', 'Hindi'],
  ['bn', 'Bengali'],
  ['ta', 'Tamil'],
  ['te', 'Telugu'],
  ['mr', 'Marathi'],
  ['ur', 'Urdu'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
  ['pt', 'Portuguese'],
  ['it', 'Italian'],
  ['ru', 'Russian'],
  ['ar', 'Arabic'],
  ['ja', 'Japanese'],
  ['zh', 'Chinese'],
];

function Tabs({ value, onChange }) {
  const tabs = [
    { value: 'ai', label: 'AI', icon: Bot },
    { value: 'preferences', label: 'Hotkey & Sound', icon: Keyboard },
    { value: 'voice', label: 'Voice', icon: Mic },
  ];
  return (
    <div className="mb-5 inline-flex rounded-[10px] border border-line-strong bg-black/20 p-[3px]" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-[12.5px] font-medium transition ${
            value === t.value ? 'bg-white/[0.08] text-ink' : 'text-ink-2 hover:text-ink'
          }`}
        >
          <t.icon className="h-3.5 w-3.5" />
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ id, checked, onChange }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full border transition ${checked ? 'border-olive-300/50 bg-olive-300/80' : 'border-line-strong bg-white/[0.06]'}`}
    >
      <span className={`absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full bg-white shadow transition-all ${checked ? 'left-[19px]' : 'left-[2px]'}`} />
    </button>
  );
}

function PresetRow({ presets, value, onPick, allowOff = false }) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-[12px] text-ink-3">Presets:</span>
      {presets.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onPick(preset)}
          className={`rounded-md border px-2 py-0.5 font-mono text-[11px] transition ${
            value === preset ? 'border-olive-300/40 bg-olive-300/10 text-ink' : 'border-line-strong text-ink-2 hover:text-ink'
          }`}
        >
          {preset}
        </button>
      ))}
      {allowOff && (
        <button
          type="button"
          onClick={() => onPick('')}
          className={`rounded-md border px-2 py-0.5 text-[11px] transition ${
            value === '' ? 'border-olive-300/40 bg-olive-300/10 text-ink' : 'border-line-strong text-ink-2 hover:text-ink'
          }`}
        >
          Off
        </button>
      )}
    </div>
  );
}

export function SettingsModal({ isOpen, onClose, onConfigSaved }) {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'preferences' | 'voice'
  const [apiKey, setApiKey] = useState('');
  const [hotkey, setHotkey] = useState('F9');
  const [voiceHotkey, setVoiceHotkey] = useState('F8');
  const [dictationHotkey, setDictationHotkey] = useState('F7');
  const [voiceLanguage, setVoiceLanguage] = useState('');
  const [dictationCleanup, setDictationCleanup] = useState(true);
  const [voiceVocabulary, setVoiceVocabulary] = useState('');
  const [voiceModel, setVoiceModel] = useState('accurate');
  const [voiceOverlay, setVoiceOverlay] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSoundEnabled(isSoundEnabled());
      setSaveError(null);
      setTestResult(null);
      invoke('get_config')
        .then((cfg) => {
          if (cfg) {
            setApiKey(cfg.groq_api_key || '');
            setHotkey(cfg.global_hotkey || 'F9');
            // Empty means "off" for the voice keys, so only fall back when the field is missing.
            setVoiceHotkey(cfg.voice_hotkey ?? 'F8');
            setDictationHotkey(cfg.dictation_hotkey ?? 'F7');
            setVoiceLanguage(cfg.voice_language || '');
            setDictationCleanup(cfg.dictation_cleanup ?? true);
            setVoiceVocabulary(cfg.voice_vocabulary || '');
            setVoiceModel(cfg.voice_model === 'fast' ? 'fast' : 'accurate');
            setVoiceOverlay(cfg.voice_overlay ?? true);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const handleTestGroq = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter a valid Groq API key first.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (res.ok) {
        setTestResult({ success: true, message: 'Connected — Groq is ready.' });
      } else {
        const data = await res.json().catch(() => ({}));
        setTestResult({ success: false, message: data.error?.message || 'Invalid API key or unauthorized.' });
      }
    } catch {
      setTestResult({ success: false, message: 'Network connection failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    // Always send every field: the backend fills missing ones with defaults.
    const newConfig = {
      groq_api_key: apiKey.trim(),
      global_hotkey: hotkey.trim() || 'F9',
      voice_hotkey: voiceHotkey.trim(),
      dictation_hotkey: dictationHotkey.trim(),
      voice_language: voiceLanguage,
      dictation_cleanup: dictationCleanup,
      voice_vocabulary: voiceVocabulary.trim(),
      voice_model: voiceModel,
      voice_overlay: voiceOverlay,
    };
    try {
      // The backend registers the hotkey first and only saves if that works.
      await invoke('update_config', { newConfig });
      saveSoundPreference(soundEnabled);
      onConfigSaved?.(newConfig);
      onClose();
    } catch (err) {
      console.error('Failed to update config:', err);
      setSaveError(typeof err === 'string' ? err : err?.message || 'Could not save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={SettingsIcon}
      title="Settings"
      description="Groq API key, hotkeys, voice and sound"
      footer={
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="settings-form" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      }
    >
      <form id="settings-form" onSubmit={handleSave}>
        <Tabs value={activeTab} onChange={setActiveTab} />

        {activeTab === 'ai' && (
          <div className="space-y-5">
            <div>
              <Label htmlFor="groq-key">Groq API key</Label>
              <div className="flex gap-2">
                <input
                  id="groq-key"
                  data-autofocus
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="gsk_…"
                  autoComplete="off"
                  spellCheck={false}
                  className={`${inputClass} h-10 font-mono text-[13px]`}
                />
                <Button variant="secondary" onClick={handleTestGroq} disabled={isTesting} className="h-10">
                  {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => open('https://console.groq.com/keys')}
                className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-olive-300 transition hover:text-olive-200"
              >
                Get a free key at console.groq.com <ArrowUpRight className="h-3.5 w-3.5" />
              </button>

              {testResult && (
                <div
                  className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] ${
                    testResult.success ? 'border-success/25 bg-success/10 text-success' : 'border-danger/25 bg-danger/10 text-danger'
                  }`}
                >
                  {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-line bg-black/20 p-4">
              <div className="text-[12.5px] font-medium text-ink-2">AI Model</div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                <span className="text-ink">{MODEL_LABEL}</span>. Without a key, tasks are parsed offline with keyword rules instead.
                Your key is stored on this PC in plain text.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="hotkey">Capture hotkey</Label>
              <input
                id="hotkey"
                type="text"
                value={hotkey}
                onChange={(e) => setHotkey(e.target.value)}
                placeholder="e.g. F9, Ctrl+Shift+T, Alt+Space"
                spellCheck={false}
                className={`${inputClass} h-10 font-mono text-[13px] text-olive-100`}
              />
              <PresetRow presets={HOTKEY_PRESETS} value={hotkey} onPick={setHotkey} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-black/20 p-4">
              <label htmlFor="soundToggle" className="flex cursor-pointer items-center gap-3">
                <Volume2 className="h-4 w-4 text-olive-300" />
                <span>
                  <span className="block text-[13.5px] font-medium text-ink">Capture chime</span>
                  <span className="block text-[12.5px] text-ink-3">Play a short sound when a task is captured.</span>
                </span>
              </label>
              <Switch id="soundToggle" checked={soundEnabled} onChange={setSoundEnabled} />
            </div>
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="space-y-6">
            {!isTauri && (
              <p className="rounded-xl border border-line bg-black/20 p-3.5 text-[12.5px] leading-relaxed text-ink-2">
                In the browser, voice works through the mic buttons in Quick add and Standup. The hold-to-talk hotkeys and
                dictation into other apps need the desktop app.
              </p>
            )}

            <div>
              <Label htmlFor="voice-hotkey" hint="Hold to speak a new task">
                Voice task hotkey
              </Label>
              <input
                id="voice-hotkey"
                type="text"
                value={voiceHotkey}
                onChange={(e) => setVoiceHotkey(e.target.value)}
                placeholder="Off"
                spellCheck={false}
                className={`${inputClass} h-10 font-mono text-[13px] text-olive-100`}
              />
              <PresetRow presets={VOICE_PRESETS} value={voiceHotkey} onPick={setVoiceHotkey} allowOff />
            </div>

            <div>
              <Label htmlFor="dictation-hotkey" hint="Hold to type speech into any app">
                Dictation hotkey
              </Label>
              <input
                id="dictation-hotkey"
                type="text"
                value={dictationHotkey}
                onChange={(e) => setDictationHotkey(e.target.value)}
                placeholder="Off"
                spellCheck={false}
                className={`${inputClass} h-10 font-mono text-[13px] text-olive-100`}
              />
              <PresetRow presets={DICTATION_PRESETS} value={dictationHotkey} onPick={setDictationHotkey} allowOff />
            </div>

            <div>
              <Label htmlFor="voice-language" hint="Pin one if detection picks the wrong script">
                Language
              </Label>
              <Select id="voice-language" value={voiceLanguage} onChange={(e) => setVoiceLanguage(e.target.value)}>
                {LANGUAGES.map(([code, name]) => (
                  <option key={code || 'auto'} value={code}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="voice-model" hint="Both use Groq Whisper">
                Transcription
              </Label>
              <Select id="voice-model" value={voiceModel} onChange={(e) => setVoiceModel(e.target.value)}>
                <option value="accurate">Most accurate (large-v3)</option>
                <option value="fast">Fastest (large-v3 turbo)</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="voice-vocabulary" hint="Separate with commas">
                Custom words
              </Label>
              <textarea
                id="voice-vocabulary"
                rows={2}
                maxLength={2000}
                value={voiceVocabulary}
                onChange={(e) => setVoiceVocabulary(e.target.value)}
                placeholder="Names, products and jargon, e.g. Priya, Kubernetes, Q3 OKRs"
                className={`${inputClass} resize-none py-2 leading-relaxed`}
              />
              <p className="mt-1.5 text-[12px] text-ink-3">Whisper spells these the way you write them here.</p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-black/20 p-4">
              <label htmlFor="voiceOverlay" className="cursor-pointer">
                <span className="block text-[13.5px] font-medium text-ink">Floating indicator</span>
                <span className="block text-[12.5px] text-ink-3">Show a small pill with a live mic level while you hold a voice key in another app.</span>
              </label>
              <Switch id="voiceOverlay" checked={voiceOverlay} onChange={setVoiceOverlay} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-black/20 p-4">
              <label htmlFor="dictationCleanup" className="cursor-pointer">
                <span className="block text-[13.5px] font-medium text-ink">Tidy dictated text</span>
                <span className="block text-[12.5px] text-ink-3">Fix punctuation and drop filler words before typing. Off types exactly what was heard.</span>
              </label>
              <Switch id="dictationCleanup" checked={dictationCleanup} onChange={setDictationCleanup} />
            </div>

            <p className="text-[12px] leading-relaxed text-ink-3">
              Recordings go straight from this device to Groq Whisper with your key and are never saved.
            </p>
          </div>
        )}

        {saveError && (
          <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2.5 text-[12.5px] text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
