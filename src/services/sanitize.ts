import type { ReviewItem } from '../types/review';

/**
 * Bias prevention (PRD §7.3 "Never shown"): items are rebuilt field-by-field from
 * a whitelist, so model/provider/token/temperature metadata a backend might return
 * is structurally unable to reach the UI — not merely hidden.
 */
export function sanitizeItem(raw: Record<string, unknown>): ReviewItem {
  return {
    id: String(raw.id ?? ''),
    workload_id: String(raw.workload_id ?? ''),
    workload_name: String(raw.workload_name ?? ''),
    original_output: String(raw.original_output ?? ''),
    prompt: raw.prompt === undefined ? undefined : String(raw.prompt),
    input_data: raw.input_data,
    created_at: String(raw.created_at ?? ''),
    already_reviewed_by_creator: Boolean(raw.already_reviewed_by_creator),
  };
}

/** Sanitize a page of items and drop anything this captain already reviewed. */
export function sanitizeItems(rawItems: Array<Record<string, unknown>>): ReviewItem[] {
  return rawItems.map(sanitizeItem).filter((item) => !item.already_reviewed_by_creator);
}
