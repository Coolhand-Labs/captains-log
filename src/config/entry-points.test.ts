import { describe, it, expect, vi } from 'vitest';
import { loadEntryPoints, entryPoints } from './entry-points';

describe('loadEntryPoints', () => {
  it('falls back to the code-shipped defaults when entry-points.json is missing', async () => {
    window.fetch = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof window.fetch;

    const result = await loadEntryPoints();

    expect(result.some((e) => e.type === 'demo')).toBe(true);
    expect(result.some((e) => e.type === 'oauth' && e.id === 'coolhand')).toBe(true);
    expect(entryPoints.value).toEqual(result);
  });

  it('falls back to defaults when the fetch throws', async () => {
    window.fetch = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof window.fetch;

    const result = await loadEntryPoints();

    expect(result.some((e) => e.type === 'demo')).toBe(true);
  });

  it('uses exactly the file contents when entry-points.json is present', async () => {
    const fileEntryPoints = [
      {
        type: 'oauth' as const,
        id: 'acme',
        label: 'Sign in with Acme',
        authorizeUrl: 'https://acme.example/oauth/authorize',
        tokenUrl: 'https://acme.example/oauth/token',
        clientId: 'acme-client',
        reviewQueueUrl: 'https://acme.example/captain/review-queue',
      },
    ];
    window.fetch = vi.fn(
      async () => new Response(JSON.stringify({ entryPoints: fileEntryPoints }), { status: 200 }),
    ) as unknown as typeof window.fetch;

    const result = await loadEntryPoints();

    expect(result).toEqual(fileEntryPoints);
    expect(result.some((e) => e.type === 'demo')).toBe(false);
    expect(entryPoints.value).toEqual(fileEntryPoints);
  });
});
