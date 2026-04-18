import { useQuery } from '@tanstack/react-query';
import { createRoute } from '@tanstack/react-router';

import { Route as RootRoute } from './__root.tsx';

const useHealth = () =>
  useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const r = await fetch('/api/health');
      if (!r.ok) throw new Error(`status ${r.status}`);
      return r.json() as Promise<{ status: string; ts: string }>;
    },
  });

function HomePage() {
  const { data, isLoading, error } = useHealth();
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Linear Exponential</h1>
      <p className="mt-2 text-sm text-slate-600">Phase 1 scaffold. Backend health check below.</p>
      <pre className="mt-4 rounded bg-slate-100 p-3 text-sm">
        {isLoading
          ? 'loading…'
          : error
            ? `error: ${(error as Error).message}`
            : JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/',
  component: HomePage,
});
