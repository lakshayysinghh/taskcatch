import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import * as tauri from './lib/tauri';
import { makeTask } from './test/fixtures';

// Use the real browser backend, but let individual tests make a command fail.
vi.mock('./lib/tauri', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, safeInvoke: vi.fn(actual.safeInvoke) };
});

const HOUR = 3600e3;
const seedTasks = (tasks) => localStorage.setItem('taskcatch_web_tasks', JSON.stringify(tasks));
const skipGuide = () => localStorage.setItem('taskcatch_onboarding_done', 'true');

/** The website opens on the overview; go to the dashboard like a visitor would. */
function renderDashboard() {
  const utils = render(<App />);
  fireEvent.click(screen.getByText('Launch Live Dashboard'));
  return utils;
}

let realInvoke;
beforeEach(async () => {
  const actual = await vi.importActual('./lib/tauri');
  realInvoke = actual.safeInvoke;
  tauri.safeInvoke.mockImplementation(realInvoke);
});

describe('App: website start', () => {
  it('opens the website on the product overview, not the dashboard', async () => {
    render(<App />);
    await act(async () => {}); // let the background task/config loading settle
    expect(screen.getByText('Launch Live Dashboard')).toBeTruthy();
    expect(screen.queryByText('Quick capture')).toBeNull();
  });

  it('does not show the guide on the overview', async () => {
    render(<App />);
    await act(async () => {});
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('App: first-run guide', () => {
  it('pops up on the first dashboard visit and can be skipped for good', async () => {
    const { unmount } = renderDashboard();
    const guide = await screen.findByRole('dialog', { name: 'Getting started with TaskCatch' });
    expect(guide.textContent).toMatch(/Welcome to TaskCatch/);

    fireEvent.click(screen.getByText('Skip tour'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem('taskcatch_onboarding_done')).toBe('true');

    // A later visit (the URL is now #dashboard) does not show it again.
    unmount();
    render(<App />);
    expect(await screen.findByText('Your task list is empty')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('steps forward and back, and finishes with Get started', async () => {
    renderDashboard();
    await screen.findByText('Welcome to TaskCatch');
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Capture from any app')).toBeTruthy();
    expect(screen.getByText('Step 2 of 4')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByText('Welcome to TaskCatch')).toBeTruthy();

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Plan your day with Standup')).toBeTruthy();
    expect(screen.queryByText('Skip tour')).toBeNull();
    fireEvent.click(screen.getByText('Get started'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem('taskcatch_onboarding_done')).toBe('true');
  });

  it('Escape skips it too', async () => {
    renderDashboard();
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem('taskcatch_onboarding_done')).toBe('true');
  });

  it('can be reopened from the help button', async () => {
    skipGuide();
    renderDashboard();
    await act(async () => {});
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByLabelText('Show guide'));
    expect(await screen.findByText('Welcome to TaskCatch')).toBeTruthy();
  });
});

describe('App: empty workspace', () => {
  it('starts with no demo data and a clean empty state', async () => {
    skipGuide();
    renderDashboard();
    expect(await screen.findByText('Your task list is empty')).toBeTruthy();
    expect(screen.queryByText('Deploy hotfix for authentication token expiry')).toBeNull();
    // Stats and filters are hidden until there is something to show.
    expect(screen.queryByLabelText('Search tasks')).toBeNull();
    expect(screen.queryByText('All categories')).toBeNull();
  });

  it('"Add your first task" opens quick add', async () => {
    skipGuide();
    renderDashboard();
    fireEvent.click(await screen.findByText('Add your first task'));
    expect(screen.getByRole('dialog', { name: 'Quick add' })).toBeTruthy();
  });
});

describe('App: with tasks', () => {
  const now = Date.now();
  const tasks = [
    makeTask({ content: 'No deadline task', deadline: null, timestamp: new Date(now - 4 * HOUR).toISOString() }),
    makeTask({ content: 'Due in two days', deadline: new Date(now + 47 * HOUR).toISOString() }),
    makeTask({ content: 'Due soon', deadline: new Date(now + 3 * HOUR).toISOString(), priority: 'Urgent', category: 'Development' }),
    makeTask({ content: 'Due tomorrow', deadline: new Date(now + 24 * HOUR).toISOString(), category: 'Finance' }),
  ];

  it('lists tasks by deadline by default (regression: deadline sort was a no-op)', async () => {
    skipGuide();
    seedTasks(tasks);
    renderDashboard();
    await screen.findByText('Due soon');
    const titles = screen
      .getAllByText((_, el) => tasks.some((t) => t.content === el?.textContent) && el.children.length === 0)
      .map((el) => el.textContent);
    expect(titles).toEqual(['Due soon', 'Due tomorrow', 'Due in two days', 'No deadline task']);
  });

  it('offers only the real categories in the filter', async () => {
    skipGuide();
    seedTasks(tasks);
    renderDashboard();
    await screen.findByText('Due soon');
    fireEvent.click(screen.getByText('All categories'));
    for (const c of ['Development', 'Finance', 'Security', 'Personal', 'General']) {
      expect(screen.getAllByText(c).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText('Work')).toBeNull();
  });

  it('shows backend failures instead of hiding them (regression: silent mock fallback)', async () => {
    skipGuide();
    tauri.safeInvoke.mockImplementation((cmd, args) =>
      cmd === 'get_tasks' ? Promise.reject('Could not read task file: disk error') : realInvoke(cmd, args)
    );
    renderDashboard();
    const banner = await screen.findByRole('alert');
    expect(banner.textContent).toMatch(/Could not load your tasks: Could not read task file: disk error/);
  });
});
