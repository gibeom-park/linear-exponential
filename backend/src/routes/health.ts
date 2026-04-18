import { Hono } from 'hono';

import type { AppBindings } from '../types.ts';

export const healthRoute = new Hono<AppBindings>().get('/', (c) =>
  c.json({ status: 'ok', ts: new Date().toISOString() }),
);
