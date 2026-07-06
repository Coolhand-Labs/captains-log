/**
 * Review-queue contract (PRD §9.1, `GET /captain/review-queue`).
 * Self-hosted backends reproduce this shape verbatim — see API.md.
 */

export interface ReviewItem {
  id: string;
  workload_id: string;
  workload_name: string;
  /** Markdown; rendered to sanitized HTML by MarkdownView. */
  original_output: string;
  /** Reference only — collapsed by default, never part of what's judged. */
  prompt?: string;
  input_data?: unknown;
  created_at: string;
  already_reviewed_by_creator?: boolean;
}

export interface ReviewQueueResponse {
  items: ReviewItem[];
  total_count: number;
  has_more: boolean;
  next_offset?: number;
}

export interface ReviewQueueQuery {
  time_window_start: string;
  time_window_end: string;
  creator_unique_id?: string;
  exclude_reviewed_by_creator?: boolean;
  workloads?: string[];
  limit?: number;
  offset?: number;
}

export interface WorkloadSummary {
  id: string;
  name: string;
  pending_count: number;
  /** Drives the "Priority to Experimental" sampling preset. */
  experimental?: boolean;
}

/**
 * The single seam between the app and any backend. Implemented by the in-memory
 * demo provider and by the HTTP client (coolhand / self-hosted / both).
 */
export interface ReviewQueueProvider {
  listWorkloads(window: { start: string; end: string }): Promise<WorkloadSummary[]>;
  fetchQueue(query: ReviewQueueQuery): Promise<ReviewQueueResponse>;
}
