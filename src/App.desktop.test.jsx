import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

// Pretend to be the desktop app for App's start-up choice; the storage calls
// still use the browser backend so the test needs no Tauri runtime.
vi.mock('./lib/tauri', async (importOriginal) => ({ ...(await importOriginal()), isTauri: true }));

describe('App (desktop)', () => {
  it('opens straight to the dashboard and shows the guide on first launch', async () => {
    render(<App />);
    expect(screen.getByText('Quick capture')).toBeTruthy();
    expect(screen.queryByText('Launch Live Dashboard')).toBeNull();
    const guide = await screen.findByRole('dialog', { name: 'Getting started with TaskCatch' });
    expect(guide).toBeTruthy();
  });

  it('shows the empty workspace, with desktop capture wording, once the guide is done', async () => {
    localStorage.setItem('taskcatch_onboarding_done', 'true');
    render(<App />);
    expect(await screen.findByText('Your task list is empty')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Highlight text in Slack, Chrome or Outlook and press the hotkey.')).toBeTruthy();
  });
});
