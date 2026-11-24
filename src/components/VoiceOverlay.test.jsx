import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const handlers = {};
vi.mock('../lib/tauri', () => ({
  safeInvoke: vi.fn(async (cmd) => (cmd === 'get_config' ? { voice_hotkey: 'F8', dictation_hotkey: 'F7' } : undefined)),
  safeListen: vi.fn(async (event, cb) => {
    handlers[event] = cb;
    return () => delete handlers[event];
  }),
}));

import { VoiceOverlay, overlayCopy } from './VoiceOverlay';

const emit = (event, payload) => act(() => handlers[event]?.({ payload }));

describe('overlay text', () => {
  it('describes every state', () => {
    const keys = { voice: 'F8', dictation: 'F7' };
    expect(overlayCopy({ state: 'listening', purpose: 'dictation' }, keys)).toEqual({ title: 'Dictating', detail: 'Release F7 when done' });
    expect(overlayCopy({ state: 'listening', purpose: 'task' }, keys).detail).toBe('Release F8 when done');
    expect(overlayCopy({ state: 'transcribing', purpose: 'dictation' }).title).toBe('Writing it down…');
    expect(overlayCopy({ state: 'done', purpose: 'dictation' }).title).toBe('Inserted');
    expect(overlayCopy({ state: 'done', purpose: 'task' }).title).toBe('Task added');
    expect(overlayCopy({ state: 'copied', purpose: 'dictation' }).detail).toBe('Press Ctrl+V to paste');
    expect(overlayCopy({ state: 'error', purpose: 'dictation', message: 'Too short' }).detail).toBe('Too short');
    expect(overlayCopy(null)).toBeNull();
  });
});

describe('floating indicator', () => {
  it('follows voice status and shows a live level while listening', async () => {
    render(<VoiceOverlay />);
    await waitFor(() => expect(handlers['voice-status']).toBeTypeOf('function'));
    expect(document.body.style.background).toBe('transparent');

    emit('voice-status', { state: 'listening', purpose: 'dictation' });
    expect(screen.getByText('Dictating')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Release F7 when done')).toBeTruthy());

    const bars = () => [...screen.getByTestId('level-meter').children].map((b) => parseInt(b.style.height, 10));
    const quiet = bars();
    emit('voice-level', 0.9);
    const loud = bars();
    expect(Math.max(...loud)).toBeGreaterThan(Math.max(...quiet));

    emit('voice-status', { state: 'transcribing', purpose: 'dictation' });
    expect(screen.getByText('Writing it down…')).toBeTruthy();
    expect(screen.queryByTestId('level-meter')).toBeNull();

    emit('voice-status', { state: 'copied', purpose: 'dictation', message: 'x' });
    expect(screen.getByText('Copied to clipboard')).toBeTruthy();
  });

  it('ignores the in-window mic buttons', async () => {
    render(<VoiceOverlay />);
    await waitFor(() => expect(handlers['voice-status']).toBeTypeOf('function'));
    emit('voice-status', { state: 'listening', purpose: 'text' });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
