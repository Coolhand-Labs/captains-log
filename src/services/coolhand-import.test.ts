import { describe, it, expect } from 'vitest';
import coolhand from 'coolhand';

/**
 * Guards the load-bearing fact behind the whole integration: the coolhand UMD
 * bundle exposes ONLY its default export (webpack `export: 'default'`), and the
 * singleton must carry the PR #19 partial-feedback API captainslog relies on.
 */
describe('coolhand default singleton', () => {
  it('exposes the widget lifecycle API on the default export', () => {
    expect(typeof coolhand.init).toBe('function');
    expect(typeof coolhand.attach).toBe('function');
    expect(typeof coolhand.detach).toBe('function');
    expect(typeof coolhand.attachPartialFeedback).toBe('function');
    expect(typeof coolhand.detachPartialFeedback).toBe('function');
    expect(typeof coolhand.destroy).toBe('function');
  });

  it('exposes the SDK version (post export-alignment PR)', () => {
    expect(typeof coolhand.version).toBe('string');
    expect(coolhand.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
