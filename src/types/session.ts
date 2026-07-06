import type { FeedbackDraft } from './feedback';

export interface SessionConfig {
  /** ISO time window the queue is drawn from. */
  windowStart: string;
  windowEnd: string;
  /** Soft time-box target in minutes. */
  targetMinutes: number;
  /** Per-workload sample rates, 0–1. Workloads absent from the map default to 1. */
  rates: Record<string, number>;
  /** Optional v1 A/B split: alternate arm tags for head-to-head comparison. */
  abSplit?: boolean;
}

export interface SubmissionRecord {
  itemId: string;
  workloadId: string;
  submittedAt: string;
  draft: FeedbackDraft;
  arm?: 'A' | 'B';
}

export interface SkipRecord {
  itemId: string;
  skippedAt: string;
}
