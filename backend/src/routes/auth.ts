// Phase 4: 회원가입 — Cf-Access 헤더로 인증된 이메일 + 초대 코드.
// POST /api/auth/register { code }: 코드 일치하면 user + 기본 settings INSERT, 200 { id }.
// GET /api/auth/me: 현재 user (요청자가 등록 상태인지 프론트가 확인용).

import { Hono } from 'hono';
import { z } from 'zod';

import { settings, users } from '@linex/shared/schema';

import { createDb } from '../lib/db.ts';
import { requireUser, resolveEmail } from '../middleware/auth.ts';
import type { AppBindings } from '../types.ts';

const registerInputSchema = z.object({
  code: z.string().min(1).max(200),
});

// 타이밍 공격 회피용 상수시간 비교 (코드가 짧아도 일관 시간).
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const authRoute = new Hono<AppBindings>()
  // 회원가입은 requireUser 를 거치지 않음 (아직 user 가 없으니까).
  .post('/register', async (c) => {
    const email = resolveEmail(c);
    if (!email) return c.json({ error: 'unauthenticated' }, 401);

    const expected = c.env.INVITE_CODE;
    if (!expected) {
      console.error('[auth] INVITE_CODE not configured');
      return c.json({ error: 'server_misconfigured' }, 500);
    }

    let parsed: z.infer<typeof registerInputSchema>;
    try {
      const body = await c.req.json();
      parsed = registerInputSchema.parse(body);
    } catch (e) {
      return c.json({ error: 'invalid_input', message: (e as Error).message }, 400);
    }

    if (!constantTimeEquals(parsed.code, expected)) {
      return c.json({ error: 'invalid_code' }, 403);
    }

    const db = createDb(c.env.DB);
    try {
      const [created] = await db.insert(users).values({ email }).returning({ id: users.id });
      if (!created) return c.json({ error: 'insert_failed' }, 500);
      // 기본 settings 1행 생성. 사용자가 /coach 진입 시 별도 등록 필요 없음.
      await db.insert(settings).values({ userId: created.id });
      return c.json({ id: created.id, email }, 201);
    } catch (e) {
      const msg = (e as Error).message ?? '';
      // SQLite UNIQUE 위반 → 이미 가입된 이메일
      if (/UNIQUE|unique/.test(msg)) {
        return c.json({ error: 'already_registered' }, 409);
      }
      throw e;
    }
  })
  // 로그인 상태 확인용. requireUser 통과 시 등록 완료, 401 이면 가입 필요.
  .get('/me', requireUser, (c) => {
    return c.json({ id: c.get('userId'), email: c.get('userEmail') });
  });
