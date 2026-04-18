import { createRouter } from '@tanstack/react-router';

import { Route as RootRoute } from './routes/__root.tsx';
import { Route as CoachRoute } from './routes/coach.tsx';
import { Route as IndexRoute } from './routes/index.tsx';

const routeTree = RootRoute.addChildren([IndexRoute, CoachRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
