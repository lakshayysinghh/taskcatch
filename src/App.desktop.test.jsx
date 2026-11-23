import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

// Pretend to be the desktop app for App's start-up choice; the storage calls
// still use the browser backend so the test needs no Tauri runtime.
vi.mock('./lib/tauri', async (importOriginal) => ({ ...(await importOriginal()), isTauri: true }));

describe('App (desktop)', () => {
  it('opens straight to the task dashboard', async () => {
    render(<App />);
    expect(screen.getByText('Quick capture')).toBeTruthy();
    expect(screen.queryByText('Launch Live Dashboard')).toBeNull();
    expect(await screen.findByText('Deploy hotfix for authentication token expiry')).toBeTruthy();
  });
});
