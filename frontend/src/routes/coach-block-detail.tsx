import { useQuery } from '@tanstack/react-query';
import { Link, createRoute } from '@tanstack/react-router';

import { BlockDetailEditor } from '@/components/coach/BlockDetailEditor';
import type { ExerciseOption } from '@/components/coach/types';

import { Route as RootRoute } from './__root.tsx';

interface SetRow {
  id: number;
  weekNo: number;
  dayNo: number;
  setNo: number;
  plannedReps: number;
  plannedWeightKg: number;
  plannedRpe: number | null;
  exerciseId: number;
  exerciseName: string;
}

interface BlockShape {
  id: number;
  weeks: number;
  daysPerWeek: number;
  selectedDays: string;
  startDate: string;
  endDate: string;
  squat1rmKg: number;
  bench1rmKg: number;
  deadlift1rmKg: number;
  deadliftStance: 'conventional' | 'sumo';
  notes: string | null;
  isActive: boolean;
}

function CoachBlockDetailPage() {
  const { id } = Route.useParams();
  const blockId = Number(id);

  const blockQ = useQuery({
    queryKey: ['block', blockId],
    queryFn: async () => {
      const r = await fetch(`/api/coach/blocks/${blockId}`);
      if (!r.ok) throw new Error(`block ${r.status}`);
      return r.json() as Promise<{ block: BlockShape; sets: SetRow[] }>;
    },
    enabled: Number.isInteger(blockId) && blockId > 0,
  });

  const exercisesQ = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const r = await fetch('/api/coach/exercises');
      if (!r.ok) throw new Error(`exercises ${r.status}`);
      return r.json() as Promise<{ exercises: ExerciseOption[] }>;
    },
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">블럭 편집</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            주 단위로 sets 를 수정하고 저장. 저장 시 해당 주의 sets 가 통째로 교체됩니다.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link to="/coach" className="underline">
            새 블럭
          </Link>
          <Link to="/" className="underline">
            ← 홈
          </Link>
        </div>
      </header>

      {blockQ.isLoading && <p className="text-sm text-muted-foreground">로딩 중…</p>}
      {blockQ.isError && (
        <p className="text-sm text-destructive">
          블럭 로드 실패: {(blockQ.error as Error).message}
        </p>
      )}
      {blockQ.data && exercisesQ.data && (
        <BlockDetailEditor
          block={blockQ.data.block}
          sets={blockQ.data.sets}
          exercises={exercisesQ.data.exercises}
        />
      )}
    </main>
  );
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/coach/blocks/$id',
  component: CoachBlockDetailPage,
});
