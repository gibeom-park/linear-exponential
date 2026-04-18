import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, createRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import type { CreateBlockInput } from '@linex/shared/validators/api/coach';

import {
  BlockParamsForm,
  type BlockParamsValue,
} from '@/components/coach/BlockParamsForm';
import { Week1TemplateBuilder } from '@/components/coach/Week1TemplateBuilder';
import type { DayDraft, ExerciseOption } from '@/components/coach/types';
import { Button } from '@/components/ui/button';

import { Route as RootRoute } from './__root.tsx';

interface SaveResponse {
  block_id: number;
  sets_inserted: number;
  end_date: string;
}

const DEFAULT_PARAMS: BlockParamsValue = {
  weeks: 4,
  selectedDays: ['mon', 'wed', 'fri'],
  startDate: '',
  squat1rmKg: 0,
  bench1rmKg: 0,
  deadlift1rmKg: 0,
  deadliftStance: 'conventional',
  notes: '',
};

function CoachPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<BlockParamsValue>(DEFAULT_PARAMS);
  const [step, setStep] = useState<1 | 2>(1);
  const [week1, setWeek1] = useState<DayDraft[]>([]);

  const exercisesQ = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const r = await fetch('/api/coach/exercises');
      if (!r.ok) throw new Error(`exercises ${r.status}`);
      return r.json() as Promise<{ exercises: ExerciseOption[] }>;
    },
  });

  const exercises = exercisesQ.data?.exercises ?? [];

  const saveMut = useMutation({
    mutationFn: async (body: CreateBlockInput) => {
      const r = await fetch('/api/coach/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`${r.status}: ${text.slice(0, 200)}`);
      }
      return r.json() as Promise<SaveResponse>;
    },
    onSuccess: (res) => {
      navigate({ to: '/coach/blocks/$id', params: { id: String(res.block_id) } });
    },
  });

  const goToStep2 = () => {
    const next: DayDraft[] = params.selectedDays.map((_, i) => ({
      dayNo: i + 1,
      exercises: [],
    }));
    setWeek1(next);
    setStep(2);
  };

  const canSave = useMemo(() => {
    if (week1.length !== params.selectedDays.length) return false;
    return week1.every((d) => d.exercises.length > 0 && d.exercises.every((e) => e.sets.length > 0));
  }, [week1, params.selectedDays.length]);

  const handleSave = () => {
    const body: CreateBlockInput = {
      weeks: params.weeks,
      daysPerWeek: params.selectedDays.length,
      selectedDays: params.selectedDays,
      startDate: params.startDate,
      squat1rmKg: params.squat1rmKg,
      bench1rmKg: params.bench1rmKg,
      deadlift1rmKg: params.deadlift1rmKg,
      deadliftStance: params.deadliftStance,
      notes: params.notes.trim() ? params.notes.trim() : null,
      week1,
    };
    saveMut.mutate(body);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">코치 모드</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            기간/요일/1RM 입력 → 주 1 템플릿 빌드 → 저장 시 N 주 자동 복제.
          </p>
        </div>
        <Link to="/" className="text-sm text-muted-foreground underline">
          ← 홈
        </Link>
      </header>

      <ol className="flex items-center gap-2 text-sm">
        <li className={step === 1 ? 'font-semibold' : 'text-muted-foreground'}>1. 블럭 파라미터</li>
        <li className="text-muted-foreground">→</li>
        <li className={step === 2 ? 'font-semibold' : 'text-muted-foreground'}>
          2. 주 1 템플릿
        </li>
      </ol>

      {step === 1 && (
        <section className="space-y-3">
          <BlockParamsForm value={params} onChange={setParams} onNext={goToStep2} />
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          {exercisesQ.isLoading && (
            <p className="text-sm text-muted-foreground">운동 카탈로그 로딩 중…</p>
          )}
          {exercisesQ.isError && (
            <p className="text-sm text-destructive">
              운동 카탈로그 로드 실패: {(exercisesQ.error as Error).message}
            </p>
          )}
          <Week1TemplateBuilder
            selectedDays={params.selectedDays}
            week1={week1}
            exercises={exercises}
            onChange={setWeek1}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              ← 파라미터 수정
            </Button>
            <div className="flex items-center gap-2">
              {saveMut.isError && (
                <span className="text-xs text-destructive">
                  저장 실패: {(saveMut.error as Error).message}
                </span>
              )}
              <Button onClick={handleSave} disabled={!canSave || saveMut.isPending}>
                {saveMut.isPending ? '저장 중…' : `저장 (${params.weeks}주 복제)`}
              </Button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/coach',
  component: CoachPage,
});
