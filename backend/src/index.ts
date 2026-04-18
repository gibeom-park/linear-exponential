import { Hono } from 'hono';

import { healthRoute } from './routes/health.ts';
import type { AppBindings } from './types.ts';

const app = new Hono<AppBindings>();

app.route('/api/health', healthRoute);

app.onError((err, c) => {
  console.error('[unhandled]', err);
  return c.json({ error: 'internal_error' }, 500);
});

export default app;
