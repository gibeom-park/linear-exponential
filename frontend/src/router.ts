import { createRouter } from '@tanstack/react-router';

import { Route as RootRoute } from './routes/__root.tsx';
import { Route as CoachBlockDetailRoute } from './routes/coach-block-detail.tsx';
import { Route as CoachRoute } from './routes/coach.tsx';
import { Route as IndexRoute } from './routes/index.tsx';
import { Route as RegisterRoute } from './routes/register.tsx';
import { Route as TrainRoute } from './routes/train.tsx';

const routeTree = RootRoute.addChildren([
  IndexRoute,
  RegisterRoute,
  CoachRoute,
  CoachBlockDetailRoute,
  TrainRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
