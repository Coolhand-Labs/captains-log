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
import { CollapsibleBlock } from '../components/CollapsibleBlock';

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
  it('collapsible blocks toggle with correct aria-expanded state', () => {
    const { getByRole, queryByText } = render(
      <CollapsibleBlock label="View Prompt" content="the prompt text" />,
    );
    const button = getByRole('button', { name: /View Prompt/ });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(queryByText('the prompt text')).toBeNull();
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(queryByText('the prompt text')).not.toBeNull();
  });

  it('sentiment buttons are a radiogroup reflecting the selection', () => {
    startDemo();
    queue.value = [item];
    currentIndex.value = 0;
    startTimer(20);
    const { getByRole } = render(<Review theme={startrekTheme} />);
    const like = getByRole('radio', { name: /Like/ });
    expect(like.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(like);
    expect(like.getAttribute('aria-checked')).toBe('true');
    stopTimer();
  });

  it('reference blocks for prompt and input data toggle independently', () => {
    startDemo();
    queue.value = [item];
    currentIndex.value = 0;
    startTimer(20);
    const { getByRole, queryByText } = render(<Review theme={startrekTheme} />);
    fireEvent.click(getByRole('button', { name: /View Prompt/ }));
    expect(queryByText('Summarize the away mission.')).not.toBeNull();
    expect(queryByText(/mission_id/)).toBeNull();
    fireEvent.click(getByRole('button', { name: /View Input Data/ }));
    expect(queryByText(/mission_id/)).not.toBeNull();
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
