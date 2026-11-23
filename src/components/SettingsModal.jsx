import React, { useState, useEffect } from 'react';
import { safeOpen as open, safeInvoke as invoke } from '../lib/tauri';
import { X, Key, Bot, Sliders, CheckCircle2, AlertCircle, Loader2, Volume2 } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled as saveSoundPreference } from '../lib/prefs';

// The model the backend actually calls (MODEL in src-tauri/src/ai_client.rs).
const MODEL_LABEL = 'Llama 3.3 70B (llama-3.3-70b-versatile) on Groq';

export function SettingsModal({ isOpen, onClose, onConfigSaved }) {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'preferences'
  const [apiKey, setApiKey] = useState('');
  const [hotkey, setHotkey] = useState('F9');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSoundEnabled(isSoundEnabled());
      setSaveError(null);
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

  if (!isOpen) return null;

  const handleTestGroq = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter a valid Groq API key first.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Direct validation fetch via Groq models API
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });

      if (res.ok) {
        setTestResult({ success: true, message: 'Connected — Groq AI ready!' });
      } else {
        const data = await res.json().catch(() => ({}));
        setTestResult({ success: false, message: data.error?.message || 'Invalid API key or unauthorized.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Network connection failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
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

      if (onConfigSaved) onConfigSaved(newConfig);
      onClose();
    } catch (err) {
      console.error('Failed to update config:', err);
      setSaveError(typeof err === 'string' ? err : err?.message || 'Could not save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--surface-glass-modal)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-lg shadow-2xl relative text-[#e4e6db] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="text-base font-bold text-[#f2f2ec]">Settings</h2>
            <p className="text-xs text-[var(--text-secondary)]">Groq API key, capture hotkey and sound</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[#f2f2ec] p-1.5 rounded-lg hover:bg-[rgba(168,173,122,0.1)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-subtle)] bg-[rgba(10,11,8,0.5)] px-5 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'border-[var(--olive-300)] text-[var(--olive-100)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[#f2f2ec]'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            AI
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'preferences'
                ? 'border-[var(--olive-300)] text-[var(--olive-100)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[#f2f2ec]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Hotkey & Sound
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Tab 1: AI Models & Keys */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-[#c8cebe] mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[var(--olive-300)]" /> Groq API Key
                  </span>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      open('https://console.groq.com/keys');
                    }}
                    className="text-[11px] text-[var(--olive-300)] hover:underline"
                  >
                    Get free key ↗
                  </a>
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gsk_..."
                    className="flex-1 bg-[rgba(10,11,8,0.9)] border border-[var(--border-subtle)] focus:border-[var(--olive-300)] text-xs text-[#f2f2ec] rounded-xl px-3 py-2 outline-none font-mono placeholder:text-[var(--text-placeholder)]"
                  />
                  <button
                    type="button"
                    onClick={handleTestGroq}
                    disabled={isTesting}
                    className="px-3 py-2 text-xs font-medium bg-[rgba(168,173,122,0.1)] hover:bg-[rgba(168,173,122,0.2)] border border-[var(--border-subtle)] text-[#d5d6cd] rounded-xl transition-all disabled:opacity-50"
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Test connection'}
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-[rgba(110,201,122,0.12)] text-[#6ec97a] border border-[#6ec97a]/25'
                        : 'bg-[rgba(255,123,123,0.12)] text-[#ff7b7b] border border-[#ff7b7b]/25'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="block text-xs font-semibold text-[#c8cebe] mb-1.5">AI Model</div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {MODEL_LABEL}. Without a key, tasks are parsed offline with keyword rules instead.
                  Your key is stored on this PC in plain text.
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Hotkey & Sound */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c8cebe] mb-1.5">Global Highlight Capture Hotkey</label>
                <input
                  type="text"
                  value={hotkey}
                  onChange={(e) => setHotkey(e.target.value)}
                  placeholder="e.g. F9, Ctrl+Shift+T, Alt+Space"
                  className="w-full bg-[rgba(10,11,8,0.9)] border border-[var(--border-subtle)] focus:border-[var(--olive-300)] text-xs font-mono text-[var(--olive-100)] rounded-xl px-3 py-2 outline-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-[var(--text-secondary)] mr-1">Presets:</span>
                  {['F9', 'CommandOrControl+Shift+T', 'Alt+Space', 'F8'].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setHotkey(preset)}
                      className="text-[10px] bg-[rgba(168,173,122,0.1)] hover:bg-[rgba(168,173,122,0.2)] border border-[var(--border-subtle)] text-[#d5d6cd] px-2 py-0.5 rounded font-mono transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="soundToggle"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[rgba(10,11,8,0.9)] accent-[var(--olive-300)]"
                  />
                  <label htmlFor="soundToggle" className="text-xs text-[#c8cebe] cursor-pointer flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-[var(--olive-300)]" /> Audio capture chime
                  </label>
                </div>
              </div>
            </div>
          )}

          {saveError && (
            <div
              role="alert"
              className="p-2.5 rounded-lg text-xs flex items-start gap-2 bg-[rgba(255,123,123,0.12)] text-[#ff7b7b] border border-[#ff7b7b]/25"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Footer Save Actions */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[#f2f2ec] rounded-xl transition-colors border border-transparent hover:border-[rgba(168,173,122,0.3)]"
              style={{ background: 'linear-gradient(135deg, rgba(35,37,28,0.5), rgba(10,11,8,0.8))' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold rounded-xl text-[#0b0c0a] shadow-[0_0_15px_rgba(168,173,122,0.2)] hover:opacity-95 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--olive-100), var(--olive-500))' }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
