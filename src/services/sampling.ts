import type { ReviewItem, WorkloadSummary } from '../types/review';
import { EST_MIN_PER_ITEM } from '../config/constants';

/** Per-workload sample rates, 0–1. Missing workloads default to 1 (review everything). */
export type SamplingRates = Record<string, number>;

/** Deterministic PRNG (mulberry32) so sampling is unit-testable; seed with Date.now() in app code. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function rateFor(rates: SamplingRates, workloadId: string): number {
  const r = rates[workloadId] ?? 1;
  return Math.min(1, Math.max(0, r));
}

/** Live projection for the Configure screen: "~40 items (~60 min)". */
export function projectSelection(
  workloads: readonly WorkloadSummary[],
  rates: SamplingRates,
  estMinPerItem = EST_MIN_PER_ITEM,
): { items: number; minutes: number } {
  const items = workloads.reduce(
    (sum, w) => sum + Math.round(w.pending_count * rateFor(rates, w.id)),
    0,
  );
  return { items, minutes: Math.round(items * estMinPerItem) };
}

/** All workloads at 100% — Quick Start's rates (selection is capped by time box instead). */
export function presetEverything(workloads: readonly WorkloadSummary[]): SamplingRates {
  return Object.fromEntries(workloads.map((w) => [w.id, 1]));
}

/**
 * "Balance Across All": distribute the captain's time budget evenly across
 * workloads, so a huge workload doesn't crowd out small ones.
 */
export function presetBalanced(
  workloads: readonly WorkloadSummary[],
  targetMinutes: number,
  estMinPerItem = EST_MIN_PER_ITEM,
): SamplingRates {
  const activeWorkloads = workloads.filter((w) => w.pending_count > 0);
  if (activeWorkloads.length === 0) return {};
  const itemsPerWorkload = targetMinutes / estMinPerItem / activeWorkloads.length;
  return Object.fromEntries(
    workloads.map((w) => [
      w.id,
      w.pending_count === 0 ? 1 : Math.min(1, itemsPerWorkload / w.pending_count),
    ]),
  );
}

/**
 * "Priority to Experimental": review 100% of experimental workloads, then fill
 * whatever time remains with a uniform slice of the mature ones.
 */
export function presetExperimental(
  workloads: readonly WorkloadSummary[],
  targetMinutes: number,
  estMinPerItem = EST_MIN_PER_ITEM,
): SamplingRates {
  const targetItems = targetMinutes / estMinPerItem;
  const experimentalItems = workloads
    .filter((w) => w.experimental)
    .reduce((sum, w) => sum + w.pending_count, 0);
  const matureCount = workloads
    .filter((w) => !w.experimental)
    .reduce((sum, w) => sum + w.pending_count, 0);
  const remaining = Math.max(0, targetItems - experimentalItems);
  const matureRate = matureCount === 0 ? 0 : Math.min(1, remaining / matureCount);
  return Object.fromEntries(workloads.map((w) => [w.id, w.experimental ? 1 : matureRate]));
}

/**
 * Client-side sampling (PRD §7.2): stratified random selection per workload at
 * the configured rate, then a global shuffle so the game isn't grouped by
 * workload. Optional cap trims the plan to the time box (Quick Start).
 */
export function samplePlan(
  items: readonly ReviewItem[],
  rates: SamplingRates,
  rand: () => number,
  cap?: number,
): ReviewItem[] {
  const byWorkload = new Map<string, ReviewItem[]>();
  for (const item of items) {
    const group = byWorkload.get(item.workload_id) ?? [];
    group.push(item);
    byWorkload.set(item.workload_id, group);
  }

  const selected: ReviewItem[] = [];
  for (const [workloadId, group] of byWorkload) {
    const take = Math.round(group.length * rateFor(rates, workloadId));
    selected.push(...shuffle(group, rand).slice(0, take));
  }

  const plan = shuffle(selected, rand);
  return cap !== undefined ? plan.slice(0, cap) : plan;
}
