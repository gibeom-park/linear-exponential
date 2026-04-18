import { describe, expect, it } from 'vitest';

import app from './index.ts';

describe('health', () => {
  it('GET /api/health → 200', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json<{ status: string }>();
    expect(body.status).toBe('ok');
  });
});
