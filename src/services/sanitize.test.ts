import { describe, it, expect } from 'vitest';
import { sanitizeItem, sanitizeItems } from './sanitize';
import { buildDemoItems } from './demo/fixtures';

describe('sanitizeItem', () => {
  it('whitelists only the reviewable fields — bias metadata cannot pass through', () => {
    const raw = buildDemoItems()[0];
    // Fixtures deliberately carry forbidden fields.
    expect(raw.model).toBeDefined();
    expect(raw.provider).toBeDefined();
    expect(raw.temperature).toBeDefined();

    const item = sanitizeItem(raw);
    expect(Object.keys(item).sort()).toEqual(
      [
        'already_reviewed_by_creator',
        'created_at',
        'id',
        'input_data',
        'original_output',
        'prompt',
        'workload_id',
        'workload_name',
      ].sort(),
    );
    expect(item).not.toHaveProperty('model');
    expect(item).not.toHaveProperty('provider');
    expect(item).not.toHaveProperty('temperature');
    expect(item).not.toHaveProperty('total_tokens');
  });

  it('drops items the captain already reviewed', () => {
    const raw = [
      { id: 'a', already_reviewed_by_creator: false },
      { id: 'b', already_reviewed_by_creator: true },
    ];
    const items = sanitizeItems(raw);
    expect(items.map((i) => i.id)).toEqual(['a']);
  });
});
