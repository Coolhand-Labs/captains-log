import type {
  ReviewQueueProvider,
  ReviewQueueQuery,
  ReviewQueueResponse,
  WorkloadSummary,
} from '../../types/review';
import { sanitizeItems } from '../sanitize';
import { buildDemoItems, demoWorkloads, type RawDemoItem } from './fixtures';

const DEFAULT_PAGE_SIZE = 100;

/**
 * In-memory ReviewQueueProvider for demo mode (PRD §5): full time-window
 * filtering and pagination semantics, zero network. `simulateFreshArrivals`
 * feeds the reward screen's "new items arrived — continue?" check.
 */
export function createDemoProvider(): ReviewQueueProvider & {
  simulateFreshArrivals(count?: number): void;
} {
  let items: RawDemoItem[] = buildDemoItems();
  let freshCounter = 0;

  const inWindow = (item: RawDemoItem, start: string, end: string) =>
    item.created_at >= start && item.created_at <= end;

  return {
    listWorkloads(window): Promise<WorkloadSummary[]> {
      return Promise.resolve(
        demoWorkloads.map((w) => ({
          id: w.id,
          name: w.name,
          experimental: w.experimental,
          pending_count: items.filter(
            (item) =>
              item.workload_id === w.id &&
              !item.already_reviewed_by_creator &&
              inWindow(item, window.start, window.end),
          ).length,
        })),
      );
    },

    fetchQueue(query: ReviewQueueQuery): Promise<ReviewQueueResponse> {
      let matched = items.filter((item) =>
        inWindow(item, query.time_window_start, query.time_window_end),
      );
      if (query.workloads?.length) {
        matched = matched.filter((item) => query.workloads!.includes(item.workload_id));
      }
      if (query.exclude_reviewed_by_creator) {
        matched = matched.filter((item) => !item.already_reviewed_by_creator);
      }
      const offset = query.offset ?? 0;
      const limit = query.limit ?? DEFAULT_PAGE_SIZE;
      const page = matched.slice(offset, offset + limit);
      return Promise.resolve({
        items: sanitizeItems(page),
        total_count: matched.length,
        has_more: offset + limit < matched.length,
        next_offset: offset + limit < matched.length ? offset + limit : undefined,
      });
    },

    simulateFreshArrivals(count = 2): void {
      const now = Date.now();
      const fresh = buildDemoItems(now)
        .slice(0, count)
        .map((item) => ({
          ...item,
          id: `fresh-${++freshCounter}-${item.id}`,
          created_at: new Date(now - 60_000).toISOString(),
          already_reviewed_by_creator: false,
        }));
      items = [...items, ...fresh];
    },
  };
}
