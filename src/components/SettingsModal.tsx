import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Cpu,
  ExternalLink,
  Loader2,
  Layers,
  Eye,
  EyeOff,
  Volume2,
  Clock,
  Keyboard,
} from 'lucide-react';
import { AppSettings } from '../lib/types';
import { api } from '../lib/tauri';
import { playChimeSound } from '../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onShowToast: (title: string, msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onShowToast,
}) => {
  const [formData, setFormData] = useState<AppSettings>({
    ...settings,
    sound_feedback_enabled: settings.sound_feedback_enabled ?? true,
    eod_time: settings.eod_time || '17:00',
  });
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showTodoistKey, setShowTodoistKey] = useState(false);
  const [isTestingGroq, setIsTestingGroq] = useState(false);
  const [isTestingTodoist, setIsTestingTodoist] = useState(false);
  const [activeTab, setActiveTab] = useState<'llm' | 'integrations' | 'system'>('llm');

  useEffect(() => {
    setFormData({
      ...settings,
      sound_feedback_enabled: settings.sound_feedback_enabled ?? true,
      eod_time: settings.eod_time || '17:00',
    });
  }, [settings]);

  if (!isOpen) return null;

  const handleTestGroq = async () => {
    const key = (formData.groq_api_key || '').trim();
    if (!key) {
      onShowToast('Missing Key', 'Enter your Groq API key first', 'warning');
      return;
    }
    setIsTestingGroq(true);
    try {
      const res = await api.testLlmConnection('groq', key, formData.groq_model || 'llama-3.3-70b-versatile');
      onShowToast('Connected', res || 'Groq API verified successfully', 'success');
    } catch (err: any) {
      onShowToast('Connection Failed', err.message || 'Connection test failed', 'error');
    } finally {
      setIsTestingGroq(false);
    }
  };

  const handleTestTodoist = async () => {
    const key = (formData.todoist_api_key || '').trim();
    if (!key) {
      onShowToast('Missing Key', 'Enter your Todoist API token first', 'warning');
      return;
    }
    setIsTestingTodoist(true);
    try {
      const res = await api.testTodoistConnection(key);
      if (res) {
        onShowToast('Connected', 'Todoist API verified successfully', 'success');
      } else {
        onShowToast('Connection Failed', 'Verification failed', 'error');
      }
    } catch (err: any) {
      onShowToast('Error', err.message || 'Verification failed', 'error');
    } finally {
      setIsTestingTodoist(false);
    }
  };

  const handleTestSound = () => {
    playChimeSound(true);
  };

  const handleSave = () => {
    onSave(formData);
    onShowToast('Saved', 'Preferences updated successfully', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-[rgba(19,20,16,0.94)] backdrop-blur-[24px] border border-[rgba(168,173,122,0.25)] rounded-[14px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(168,173,122,0.14)]">
          <h3 className="text-[15px] font-semibold text-[#f2f2ec]">
            Preferences & Settings
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#93958a] hover:text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.1)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-[rgba(168,173,122,0.14)] gap-4 bg-[#0a0b08]">
          <button
            onClick={() => setActiveTab('llm')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'llm'
                ? 'border-[#a8ad7a] text-[#f2f2ec]'
                : 'border-transparent text-[#93958a] hover:text-[#d5d6cd]'
            }`}
          >
            AI Models & Keys
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'integrations'
                ? 'border-[#a8ad7a] text-[#f2f2ec]'
                : 'border-transparent text-[#93958a] hover:text-[#d5d6cd]'
            }`}
          >
            Integrations
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'system'
                ? 'border-[#a8ad7a] text-[#f2f2ec]'
                : 'border-transparent text-[#93958a] hover:text-[#d5d6cd]'
            }`}
          >
            Workday, Sound & Hotkeys
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'llm' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#f2f2ec] uppercase tracking-wider">
                    Groq Cloud API Key
                  </h4>
                  <p className="text-xs text-[#93958a]">
                    Instant inference with multi-task splitting
                  </p>
                </div>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#a8ad7a] hover:text-[#d9dcc4] flex items-center gap-1"
                >
                  <span>Get Free Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showGroqKey ? 'text' : 'password'}
                  value={formData.groq_api_key || ''}
                  onChange={(e) => setFormData({ ...formData, groq_api_key: e.target.value })}
                  placeholder="gsk_..."
                  className="w-full pl-3.5 pr-20 py-2.5 bg-[#0a0b08] border border-[rgba(168,173,122,0.2)] focus:border-[#a8ad7a] rounded-[10px] text-xs text-[#f2f2ec] font-mono placeholder-[#4f5b47] outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowGroqKey(!showGroqKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93958a] hover:text-[#d5d6cd] cursor-pointer"
                >
                  {showGroqKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <select
                  value={formData.groq_model || 'llama-3.3-70b-versatile'}
                  onChange={(e) => setFormData({ ...formData, groq_model: e.target.value })}
                  className="bg-[#0a0b08] border border-[rgba(168,173,122,0.2)] text-xs text-[#d5d6cd] px-3 py-2 rounded-[8px] focus:outline-none focus:border-[#a8ad7a]"
                >
                  <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Recommended)</option>
                  <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fastest)</option>
                  <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
                </select>

                <button
                  onClick={handleTestGroq}
                  disabled={isTestingGroq}
                  className="px-3.5 py-2 rounded-[8px] text-xs font-medium text-[#a8ad7a] hover:text-[#f2f2ec] bg-[rgba(168,173,122,0.12)] hover:bg-[rgba(168,173,122,0.22)] border border-[rgba(168,173,122,0.25)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTestingGroq ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-3 h-3" />
                      <span>Test connection</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#f2f2ec] uppercase tracking-wider">
                    Todoist Sync
                  </h4>
                  <p className="text-xs text-[#93958a]">
                    Push extracted tasks directly to Todoist
                  </p>
                </div>
                <a
                  href="https://app.todoist.com/app/settings/integrations/developer"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#a8ad7a] hover:text-[#d9dcc4] flex items-center gap-1"
                >
                  <span>API Token</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showTodoistKey ? 'text' : 'password'}
                  value={formData.todoist_api_key || ''}
                  onChange={(e) => setFormData({ ...formData, todoist_api_key: e.target.value })}
                  placeholder="Todoist API token"
                  className="w-full pl-3.5 pr-20 py-2.5 bg-[#0a0b08] border border-[rgba(168,173,122,0.2)] focus:border-[#a8ad7a] rounded-[10px] text-xs text-[#f2f2ec] font-mono placeholder-[#4f5b47] outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowTodoistKey(!showTodoistKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93958a] hover:text-[#d5d6cd] cursor-pointer"
                >
                  {showTodoistKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-[#93958a] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.todoist_sync_enabled || false}
                    onChange={(e) => setFormData({ ...formData, todoist_sync_enabled: e.target.checked })}
                    className="rounded text-[#a8ad7a] bg-[#0a0b08] border-[rgba(168,173,122,0.2)]"
                  />
                  <span>Auto-sync all captured tasks</span>
                </label>

                <button
                  onClick={handleTestTodoist}
                  disabled={isTestingTodoist}
                  className="px-3.5 py-2 rounded-[8px] text-xs font-medium text-[#a8ad7a] hover:text-[#f2f2ec] bg-[rgba(168,173,122,0.12)] hover:bg-[rgba(168,173,122,0.22)] border border-[rgba(168,173,122,0.25)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTestingTodoist ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3 h-3" />
                      <span>Test token</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-4 text-xs text-[#93958a]">
              {/* Workday & EOD Setting */}
              <div className="p-4 rounded-[10px] bg-[#0a0b08] border border-[rgba(168,173,122,0.2)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#a8ad7a]" />
                    <span className="font-semibold text-[#f2f2ec]">End of Day (EOD) Deadline Hour</span>
                  </div>
                  <select
                    value={formData.eod_time || '17:00'}
                    onChange={(e) => setFormData({ ...formData, eod_time: e.target.value })}
                    className="bg-[#131410] border border-[rgba(168,173,122,0.25)] text-[#f2f2ec] px-3 py-1.5 rounded-[6px] text-xs focus:outline-none focus:border-[#a8ad7a] cursor-pointer"
                  >
                    <option value="17:00">5:00 PM (17:00)</option>
                    <option value="18:00">6:00 PM (18:00)</option>
                    <option value="19:00">7:00 PM (19:00)</option>
                    <option value="20:00">8:00 PM (20:00)</option>
                  </select>
                </div>
                <p className="text-[11px] text-[#93958a]">
                  Relative dates like "by EOD" or "tonight" will be pegged to this specific time.
                </p>
              </div>

              {/* Sound Feedback Toggle */}
              <div className="p-4 rounded-[10px] bg-[#0a0b08] border border-[rgba(168,173,122,0.2)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-[#a8ad7a]" />
                  <div>
                    <div className="font-semibold text-[#f2f2ec]">Audio Capture Chime</div>
                    <div className="text-[11px] text-[#93958a]">Play a subtle confirmation sound when a task is extracted</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestSound}
                    className="text-[11px] text-[#a8ad7a] hover:text-[#d9dcc4] px-2 py-1 rounded bg-[rgba(168,173,122,0.1)] border border-[rgba(168,173,122,0.2)]"
                  >
                    Test
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sound_feedback_enabled ?? true}
                      onChange={(e) => setFormData({ ...formData, sound_feedback_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#23241d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#d9dcc4] after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#7c8450]" />
                  </label>
                </div>
              </div>

              {/* Global Shortcuts Reference */}
              <div className="p-4 rounded-[10px] bg-[#0a0b08] border border-[rgba(168,173,122,0.2)] space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Keyboard className="w-4 h-4 text-[#a8ad7a]" />
                  <span className="font-semibold text-[#f2f2ec]">Configured Global Shortcuts</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span>Primary Capture (Single-Key)</span>
                    <span className="px-2 py-0.5 rounded bg-[#23241d] text-[#a8ad7a] font-mono font-bold">F9</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>2-Key Fast Capture</span>
                    <span className="px-2 py-0.5 rounded bg-[#23241d] text-[#a8ad7a] font-mono font-bold">Alt + C</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>In-App Quick Add / Command Bar</span>
                    <span className="px-2 py-0.5 rounded bg-[#23241d] text-[#a8ad7a] font-mono font-bold">Ctrl + K</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[rgba(168,173,122,0.14)] bg-[#0a0b08]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[8px] text-xs font-medium text-[#93958a] hover:text-[#f2f2ec] hover:bg-[rgba(168,173,122,0.1)] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-[8px] text-xs font-semibold text-[#0b0c0a] bg-gradient-to-br from-[#d9dcc4] to-[#7c8450] hover:brightness-105 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Save preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};
