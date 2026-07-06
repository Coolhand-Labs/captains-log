import { describe, it, expect } from 'vitest';
import type { ReviewItem, WorkloadSummary } from '../types/review';
import {
  mulberry32,
  shuffle,
  projectSelection,
  presetBalanced,
  presetExperimental,
  presetEverything,
  samplePlan,
} from './sampling';

const workloads: WorkloadSummary[] = [
  { id: 'big', name: 'Big Mature', pending_count: 100 },
  { id: 'small', name: 'Small Mature', pending_count: 10 },
  { id: 'exp', name: 'New Experiment', pending_count: 8, experimental: true },
];

function makeItems(workloadId: string, count: number): ReviewItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${workloadId}-${i}`,
    workload_id: workloadId,
    workload_name: workloadId,
    original_output: '# out',
    created_at: '2026-07-06T00:00:00Z',
  }));
}

describe('projectSelection', () => {
  it('sums rounded per-workload counts and estimates minutes', () => {
    const { items, minutes } = projectSelection(workloads, { big: 0.25, small: 1, exp: 1 }, 1.5);
    expect(items).toBe(25 + 10 + 8);
    expect(minutes).toBe(Math.round(43 * 1.5));
  });

  it('treats missing workloads as 100% and clamps rates', () => {
    expect(projectSelection(workloads, {}).items).toBe(118);
    expect(projectSelection(workloads, { big: 5 }).items).toBe(118);
    expect(projectSelection(workloads, { big: -1 }).items).toBe(18);
  });
});

describe('presets', () => {
  it('presetEverything sets every workload to 1', () => {
    expect(presetEverything(workloads)).toEqual({ big: 1, small: 1, exp: 1 });
  });

  it('presetBalanced gives each workload an equal share of the time budget', () => {
    // 60 min / 1.5 = 40 items across 3 workloads → ~13.3 items each.
    const rates = presetBalanced(workloads, 60, 1.5);
    expect(rates.big).toBeCloseTo(13.33 / 100, 1);
    expect(rates.small).toBe(1); // 13.3 wanted > 10 pending → clamp to 100%
    expect(rates.exp).toBe(1);
  });

  it('presetExperimental reviews all experimental items, fills remainder from mature', () => {
    const rates = presetExperimental(workloads, 60, 1.5);
    expect(rates.exp).toBe(1);
    // 40 target - 8 experimental = 32 across 110 mature items.
    expect(rates.big).toBeCloseTo(32 / 110, 5);
    expect(rates.small).toBeCloseTo(32 / 110, 5);
  });

  it('presetExperimental gives mature workloads nothing when experiments fill the box', () => {
    const rates = presetExperimental(workloads, 10, 1.5); // ~6.7 items < 8 experimental
    expect(rates.exp).toBe(1);
    expect(rates.big).toBe(0);
  });
});

describe('samplePlan', () => {
  const items = [...makeItems('big', 100), ...makeItems('small', 10), ...makeItems('exp', 8)];

  it('is deterministic for a given seed', () => {
    const a = samplePlan(items, { big: 0.2 }, mulberry32(42));
    const b = samplePlan(items, { big: 0.2 }, mulberry32(42));
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
  });

  it('takes round(count*rate) per workload without duplicates', () => {
    const plan = samplePlan(items, { big: 0.2, small: 0.5, exp: 1 }, mulberry32(1));
    const byWorkload = (id: string) => plan.filter((i) => i.workload_id === id).length;
    expect(byWorkload('big')).toBe(20);
    expect(byWorkload('small')).toBe(5);
    expect(byWorkload('exp')).toBe(8);
    expect(new Set(plan.map((i) => i.id)).size).toBe(plan.length);
  });

  it('applies the cap after the global shuffle', () => {
    const plan = samplePlan(items, {}, mulberry32(7), 15);
    expect(plan).toHaveLength(15);
    // Capped plan should not be all from one workload (it was shuffled first).
    expect(new Set(plan.map((i) => i.workload_id)).size).toBeGreaterThan(1);
  });

  it('shuffle preserves membership', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr, mulberry32(3)).sort()).toEqual(arr);
  });
});
