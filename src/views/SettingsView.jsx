import React, { useState, useEffect } from 'react';
import { safeInvoke as invoke } from '../lib/tauri';
import { Button } from '../components/Button';

export function SettingsView() {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Load existing config
    invoke('get_config').then((config) => {
      if (config && config.groq_api_key) {
        setApiKey(config.groq_api_key);
      }
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    try {
      setStatus('Saving...');
      await invoke('update_config', { newConfig: { groq_api_key: apiKey } });
      setStatus('Saved successfully!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error(error);
      setStatus('Failed to save.');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto flex flex-col gap-6">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-2">Manage your API keys and preferences.</p>
      </header>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium mb-1">Groq API Key</label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="gsk_..."
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Your key is stored securely in the local application config.
          </p>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <Button onClick={handleSave}>Save Settings</Button>
          {status && <span className="text-sm font-medium text-green-500">{status}</span>}
        </div>
      </div>
    </div>
  );
}
