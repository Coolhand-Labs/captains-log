import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { Landing } from './Landing';
import { Configure } from './Configure';
import { Review } from './Review';
import { Reward } from './Reward';
import { startrekTheme } from '../theme/startrek';
import { installFeedbackTransport } from '../services/feedback-transport';
import { queue, currentIndex, resetSession, startDemo } from '../state/session';
import { startTimer, stopTimer } from '../state/timer';
import type { ReviewItem } from '../types/review';

const item: ReviewItem = {
  id: 'a11y-item',
  workload_id: 'away-team-report',
  workload_name: 'Away Team Report',
  original_output: '# Mission Summary\n\nAll crew returned safely.',
  prompt: 'Summarize the away mission.',
  input_data: { mission_id: 'AT-1' },
  created_at: '2026-07-06T10:00:00Z',
};

beforeAll(() => {
  window.fetch = vi.fn(async () => new Response('{}', { status: 200 }));
  installFeedbackTransport();
});

beforeEach(() => {
  resetSession();
  stopTimer();
  document.body.innerHTML = '';
});

describe('a11y: screens have no axe violations', () => {
  it('a11y Landing', async () => {
    const { container } = render(<Landing theme={startrekTheme} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('a11y Landing auth modal', async () => {
    const { container, getByText } = render(<Landing theme={startrekTheme} />);
    fireEvent.click(getByText(startrekTheme.landingConnectCta));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('a11y Configure (demo workloads loaded)', async () => {
    startDemo();
    const { container, findByText } = render(<Configure theme={startrekTheme} />);
    await findByText('Engineering Report Generation');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('a11y Review', async () => {
    startDemo();
    queue.value = [item];
    currentIndex.value = 0;
    startTimer(20);
    const { container } = render(<Review theme={startrekTheme} />);
    expect(await axe(container)).toHaveNoViolations();
    stopTimer();
  });

  it('a11y Reward', async () => {
    startDemo();
    const { container } = render(<Reward theme={startrekTheme} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('a11y: keyboard interaction', () => {
  it('sentiment buttons are a radiogroup reflecting the selection', () => {
    startDemo();
    queue.value = [item];
    currentIndex.value = 0;
    startTimer(20);
    const { getByRole } = render(<Review theme={startrekTheme} />);
    const good = getByRole('radio', { name: /Good/ });
    expect(good.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(good);
    expect(good.getAttribute('aria-checked')).toBe('true');
    stopTimer();
  });

  it('reference panel docks beside the output, prompt and input independently', async () => {
    startDemo();
    queue.value = [item];
    currentIndex.value = 0;
    startTimer(20);
    const { getByRole, queryByText, container } = render(<Review theme={startrekTheme} />);

    // Hidden by default (PRD §7.3).
    expect(queryByText('Summarize the away mission.')).toBeNull();
    expect(queryByText(/mission_id/)).toBeNull();

    // Open the prompt — NON-modal side panel; the output stays rendered and interactive.
    fireEvent.click(getByRole('button', { name: 'View Prompt' }));
    expect(queryByText('Summarize the away mission.')).not.toBeNull();
    expect(queryByText(/mission_id/)).toBeNull();
    expect(queryByText(/All crew returned safely/)).not.toBeNull();
    // No dialog/backdrop involved — the panel is a plain complementary region.
    expect(container.querySelector('dialog')).toBeNull();
    expect(getByRole('complementary', { name: 'Reference' })).toBeTruthy();

    // Switch to input data inside the panel.
    fireEvent.click(getByRole('button', { name: 'Input Data' }));
    expect(queryByText(/mission_id/)).not.toBeNull();
    expect(queryByText('Summarize the away mission.')).toBeNull();

    // Panel-open state passes axe.
    expect(await axe(container)).toHaveNoViolations();

    // Close restores the hidden-by-default state; toggling the button does too.
    fireEvent.click(getByRole('button', { name: 'Close reference' }));
    expect(queryByText(/mission_id/)).toBeNull();
    fireEvent.click(getByRole('button', { name: 'View Input Data' }));
    expect(queryByText(/mission_id/)).not.toBeNull();
    fireEvent.click(getByRole('button', { name: 'View Input Data' }));
    expect(queryByText(/mission_id/)).toBeNull();
    stopTimer();
  });

  it('never renders model/provider metadata on the review screen', () => {
    startDemo();
    queue.value = [item];
    currentIndex.value = 0;
    startTimer(20);
    const { container } = render(<Review theme={startrekTheme} />);
    expect(container.textContent).not.toMatch(/model|provider|temperature|tokens/i);
    stopTimer();
  });
});
