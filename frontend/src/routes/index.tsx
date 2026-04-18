import { useQuery } from '@tanstack/react-query';
import { Link, createRoute } from '@tanstack/react-router';

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
      <p className="mt-2 text-sm text-slate-600">파워리프팅 프로그램 도구.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/coach"
          className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          코치 모드 →
        </Link>
        <Link
          to="/train"
          className="inline-block rounded-md border border-slate-900 px-4 py-2 text-sm font-medium text-slate-900"
        >
          훈련 모드 →
        </Link>
      </div>
      <pre className="mt-6 rounded bg-slate-100 p-3 text-xs text-slate-500">
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
