import { Hono } from 'hono';

import { coachRoute } from './routes/coach.ts';
import { healthRoute } from './routes/health.ts';
import { trainRoute } from './routes/train.ts';
import type { AppBindings } from './types.ts';

const app = new Hono<AppBindings>();

app.route('/api/health', healthRoute);
app.route('/api/coach', coachRoute);
app.route('/api/train', trainRoute);

app.onError((err, c) => {
  console.error('[unhandled]', err);
  return c.json({ error: 'internal_error' }, 500);
});

export default app;
