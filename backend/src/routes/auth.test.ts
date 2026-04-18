// 인증/가입 라우트 단위 테스트.
// /register 의 invite code / Cf-Access 검증과 /me 의 단락 동작을 본다.
// DB 가 실제 필요한 INSERT happy path 는 E2E (`pnpm dev`) 에서.

import { describe, expect, it } from 'vitest';

import app from '../index.ts';

describe('POST /api/auth/register', () => {
  it('이메일 없으면 401 unauthenticated', async () => {
    const res = await app.request(
      '/api/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'whatever' }),
      },
      { INVITE_CODE: 'right' },
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
  });

  it('INVITE_CODE 환경변수 미설정이면 500', async () => {
    const res = await app.request(
      '/api/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'whatever' }),
      },
      { DEV_USER_EMAIL: 'a@b.com', INVITE_CODE: '' },
    );
    expect(res.status).toBe(500);
  });

  it('잘못된 입력 (code 누락) 은 400', async () => {
    const res = await app.request(
      '/api/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
      { DEV_USER_EMAIL: 'a@b.com', INVITE_CODE: 'right' },
    );
    expect(res.status).toBe(400);
  });

  it('잘못된 코드는 403', async () => {
    const res = await app.request(
      '/api/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'wrong' }),
      },
      { DEV_USER_EMAIL: 'a@b.com', INVITE_CODE: 'right' },
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'invalid_code' });
  });

  it('길이 다른 코드도 timing-safe 비교로 403', async () => {
    const res = await app.request(
      '/api/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'short' }),
      },
      { DEV_USER_EMAIL: 'a@b.com', INVITE_CODE: 'much-longer-code' },
    );
    expect(res.status).toBe(403);
  });
});

describe('GET /api/auth/me', () => {
  it('이메일 없으면 401', async () => {
    const res = await app.request('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('DEV_USER_ID 단락으로 통과', async () => {
    const res = await app.request('/api/auth/me', undefined, {
      DEV_USER_EMAIL: 'me@example.com',
      DEV_USER_ID: 3,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 3, email: 'me@example.com' });
  });
});
