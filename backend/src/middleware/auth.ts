// Cf-Access 헤더로 user 매핑. 없으면 401 → 프론트가 /register 로 유도.
// 로컬 dev: Access 헤더가 없으므로 DEV_USER_EMAIL 로 fallback.
// 테스트: DEV_USER_ID 까지 세팅하면 DB 조회 없이 그 ID 로 단락 (Miniflare D1 setup 불필요).

import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';

import { users } from '@linex/shared/schema';

import { createDb } from '../lib/db.ts';
import type { AppBindings } from '../types.ts';

const ACCESS_EMAIL_HEADER = 'cf-access-authenticated-user-email';

export function resolveEmail(c: {
  req: { header: (k: string) => string | undefined };
  env?: { DEV_USER_EMAIL?: string } | null;
}): string | null {
  const fromAccess = c.req.header(ACCESS_EMAIL_HEADER);
  if (fromAccess) return fromAccess.trim().toLowerCase();
  const fromEnv = c.env?.DEV_USER_EMAIL;
  if (fromEnv) return fromEnv.trim().toLowerCase();
  return null;
}

export const requireUser = createMiddleware<AppBindings>(async (c, next) => {
  const email = resolveEmail(c);
  if (!email) {
    return c.json({ error: 'unauthenticated' }, 401);
  }
  // 테스트 단락: DEV_USER_ID 가 있으면 DB lookup skip.
  const devId = c.env?.DEV_USER_ID;
  if (devId !== undefined && devId !== null && devId !== '') {
    const id = typeof devId === 'number' ? devId : Number(devId);
    if (Number.isInteger(id) && id > 0) {
      c.set('userId', id);
      c.set('userEmail', email);
      await next();
      return;
    }
  }
  const db = createDb(c.env.DB);
  const row = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (!row) {
    return c.json({ error: 'registration_required', email }, 401);
  }
  c.set('userId', row.id);
  c.set('userEmail', email);
  await next();
});
