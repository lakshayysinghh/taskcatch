import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import * as tauri from './lib/tauri';

// Use the real browser backend, but let individual tests make a command fail.
vi.mock('./lib/tauri', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, safeInvoke: vi.fn(actual.safeInvoke) };
});

const SAMPLE_TITLES = [
  'Deploy hotfix for authentication token expiry', // due in 4h
  'Review Q3 financial projections spreadsheet', // due in 24h
  'Store the provided key in a secure vault', // due in 48h
  'Order replacement ergonomic mouse', // no deadline
];

let realInvoke;
beforeEach(async () => {
  const actual = await vi.importActual('./lib/tauri');
  realInvoke = actual.safeInvoke;
  tauri.safeInvoke.mockImplementation(realInvoke);
});

/** The website opens on the overview; go to the dashboard like a visitor would. */
function renderDashboard() {
  render(<App />);
  fireEvent.click(screen.getByText('Launch Live Dashboard'));
}

describe('App', () => {
  it('opens the website on the product overview, not the dashboard', async () => {
    render(<App />);
    await act(async () => {}); // let the background task/config loading settle
    expect(screen.getByText('Launch Live Dashboard')).toBeTruthy();
    expect(screen.queryByText('quick capture')).toBeNull();
  });

  it('lists tasks by deadline by default (regression: deadline sort was a no-op)', async () => {
    renderDashboard();
    await screen.findByText(SAMPLE_TITLES[0]);
    const titles = screen
      .getAllByText((_, el) => SAMPLE_TITLES.includes(el?.textContent) && el.children.length === 0)
      .map((el) => el.textContent);
    expect(titles).toEqual(SAMPLE_TITLES);
  });

  it('shows backend failures instead of hiding them (regression: silent mock fallback)', async () => {
    tauri.safeInvoke.mockImplementation((cmd, args) =>
      cmd === 'get_tasks' ? Promise.reject('Could not read task file: disk error') : realInvoke(cmd, args)
    );
    renderDashboard();
    const banner = await screen.findByRole('alert');
    expect(banner.textContent).toMatch(/Could not load your tasks: Could not read task file: disk error/);
  });

  it('offers only the real categories in the filter', async () => {
    renderDashboard();
    await screen.findByText(SAMPLE_TITLES[0]);
    fireEvent.click(screen.getByText('All categories'));
    for (const c of ['Development', 'Finance', 'Security', 'Personal', 'General']) {
      expect(screen.getAllByText(c).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText('Work')).toBeNull();
  });
});
