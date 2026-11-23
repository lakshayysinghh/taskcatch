import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, Bot, CheckCircle2, Keyboard, Loader2, Settings as SettingsIcon, Volume2 } from 'lucide-react';
import { safeOpen as open, safeInvoke as invoke } from '../lib/tauri';
import { isSoundEnabled, setSoundEnabled as saveSoundPreference } from '../lib/prefs';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Label, inputClass } from './ui/Field';

// The model the backend actually calls (MODEL in src-tauri/src/ai_client.rs).
const MODEL_LABEL = 'Llama 3.3 70B (llama-3.3-70b-versatile) on Groq';
const HOTKEY_PRESETS = ['F9', 'F8', 'CommandOrControl+Shift+T', 'Alt+Space'];

function Tabs({ value, onChange }) {
  const tabs = [
    { value: 'ai', label: 'AI', icon: Bot },
    { value: 'preferences', label: 'Hotkey & Sound', icon: Keyboard },
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

export function SettingsModal({ isOpen, onClose, onConfigSaved }) {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'preferences'
  const [apiKey, setApiKey] = useState('');
  const [hotkey, setHotkey] = useState('F9');
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

    const newConfig = {
      groq_api_key: apiKey.trim(),
      global_hotkey: hotkey.trim() || 'F9',
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
      description="Groq API key, capture hotkey and sound"
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
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 text-[12px] text-ink-3">Presets:</span>
                {HOTKEY_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setHotkey(preset)}
                    className={`rounded-md border px-2 py-0.5 font-mono text-[11px] transition ${
                      hotkey === preset ? 'border-olive-300/40 bg-olive-300/10 text-ink' : 'border-line-strong text-ink-2 hover:text-ink'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
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
