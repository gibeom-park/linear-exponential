// requireUser / resolveEmail 단위 테스트.
// DB lookup 단락은 DEV_USER_ID 로 검증 (실제 D1 setup 없이).

import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import type { AppBindings } from '../types.ts';
import { requireUser, resolveEmail } from './auth.ts';

function buildApp() {
  return new Hono<AppBindings>()
    .use('*', requireUser)
    .get('/me', (c) => c.json({ id: c.get('userId'), email: c.get('userEmail') }));
}

describe('resolveEmail', () => {
  const env = { DEV_USER_EMAIL: 'fallback@example.com' } as { DEV_USER_EMAIL?: string };

  it('Cf-Access 헤더 우선', () => {
    const c = {
      req: {
        header: (k: string) => (k === 'cf-access-authenticated-user-email' ? 'X@Y.com' : undefined),
      },
      env,
    };
    expect(resolveEmail(c)).toBe('x@y.com');
  });

  it('헤더 없으면 DEV_USER_EMAIL 로 fallback', () => {
    const c = { req: { header: () => undefined }, env };
    expect(resolveEmail(c)).toBe('fallback@example.com');
  });

  it('헤더도 env 도 없으면 null', () => {
    const c = { req: { header: () => undefined }, env: {} as { DEV_USER_EMAIL?: string } };
    expect(resolveEmail(c)).toBeNull();
  });
});

describe('requireUser', () => {
  it('이메일이 없으면 401 unauthenticated', async () => {
    const app = buildApp();
    const res = await app.request('/me');
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
  });

  it('DEV_USER_ID 가 있으면 DB lookup 없이 통과', async () => {
    const app = buildApp();
    const res = await app.request('/me', undefined, {
      DEV_USER_EMAIL: 'dev@example.com',
      DEV_USER_ID: 7,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 7, email: 'dev@example.com' });
  });

  it('Cf-Access 헤더 + DEV_USER_ID 단락', async () => {
    const app = buildApp();
    const res = await app.request(
      '/me',
      { headers: { 'cf-access-authenticated-user-email': 'Real@User.com' } },
      { DEV_USER_ID: 42 },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 42, email: 'real@user.com' });
  });
});
