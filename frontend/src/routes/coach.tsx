import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, createRoute } from '@tanstack/react-router';
import { useState } from 'react';

import type { ProgramType } from '@linex/shared/enums';
import type { GenerateBlockInput } from '@linex/shared/validators/api/coach';
import type { LlmCoachOutput } from '@linex/shared/validators/llm/coach_output';

import { BlockGeneratorForm } from '@/components/coach/BlockGeneratorForm';
import { type ExerciseOption, PlanEditor } from '@/components/coach/PlanEditor';
import { ProgramTypeCards } from '@/components/coach/ProgramTypeCards';
import { Button } from '@/components/ui/button';

import { Route as RootRoute } from './__root.tsx';

interface PreviewResponse {
  plan: LlmCoachOutput;
  model: string;
  prompt_version: number;
}

interface SaveResponse {
  block_id: number;
  sets_inserted: number;
  unknown_exercises: string[];
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json() as Promise<T>;
}

function CoachPage() {
  const [programType, setProgramType] = useState<ProgramType | null>(null);
  const [input, setInput] = useState<GenerateBlockInput | null>(null);
  const [plan, setPlan] = useState<LlmCoachOutput | null>(null);
  const [savedBlockId, setSavedBlockId] = useState<number | null>(null);
  const [unknownExercises, setUnknownExercises] = useState<string[]>([]);

  const exercisesQ = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const r = await fetch('/api/coach/exercises');
      if (!r.ok) throw new Error(`exercises ${r.status}`);
      return r.json() as Promise<{ exercises: ExerciseOption[] }>;
    },
  });

  const previewMut = useMutation({
    mutationFn: (i: GenerateBlockInput) => postJson<PreviewResponse>('/api/coach/preview', i),
    onSuccess: (res, vars) => {
      setInput(vars);
      setPlan(res.plan);
      setSavedBlockId(null);
      setUnknownExercises([]);
    },
  });

  const saveMut = useMutation({
    mutationFn: (body: { input: GenerateBlockInput; plan: LlmCoachOutput }) =>
      postJson<SaveResponse>('/api/coach/blocks', body),
    onSuccess: (res) => {
      setSavedBlockId(res.block_id);
      setUnknownExercises(res.unknown_exercises);
    },
  });

  const reset = () => {
    setProgramType(null);
    setInput(null);
    setPlan(null);
    setSavedBlockId(null);
    setUnknownExercises([]);
    previewMut.reset();
    saveMut.reset();
  };

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">코치 모드</h1>
          <p className="mt-1 text-sm text-slate-600">
            프로그램 타입을 고르고 입력 → Gemini 가 제안 → 카드에서 자유롭게 편집 → 저장.
          </p>
        </div>
        <Link to="/" className="text-sm text-slate-500 underline">
          ← 홈
        </Link>
      </header>

      <Section title="1. 프로그램 타입">
        <ProgramTypeCards selected={programType} onSelect={setProgramType} />
      </Section>

      {programType && (
        <Section title="2. 입력">
          <BlockGeneratorForm
            programType={programType}
            loading={previewMut.isPending}
            onGenerate={(i) => previewMut.mutate(i)}
          />
          {previewMut.isError && (
            <ErrorBox message={`제안 생성 실패: ${(previewMut.error as Error).message}`} />
          )}
        </Section>
      )}

      {plan && input && (
        <Section title="3. 카드 편집">
          <p className="text-sm text-slate-600">
            제안된 plan 을 기초로 자유롭게 수정. 세트/운동 추가·삭제, 무게/반복/RPE 조정 가능.
          </p>
          <PlanEditor plan={plan} exercises={exercisesQ.data?.exercises ?? []} onChange={setPlan} />
          <div className="flex items-center gap-2">
            <Button onClick={() => saveMut.mutate({ input, plan })} disabled={saveMut.isPending}>
              {saveMut.isPending ? '저장 중…' : '이 블럭 저장 (활성화)'}
            </Button>
            <Button variant="outline" onClick={reset}>
              처음부터 다시
            </Button>
          </div>
          {saveMut.isError && (
            <ErrorBox message={`저장 실패: ${(saveMut.error as Error).message}`} />
          )}
        </Section>
      )}

      {savedBlockId !== null && (
        <Section title="4. 저장 완료">
          <div className="rounded-md bg-green-50 p-4 text-sm">
            <p className="font-medium text-green-900">
              블럭 #{savedBlockId} 저장됨. 활성 블럭으로 전환되었습니다.
            </p>
            {unknownExercises.length > 0 && (
              <div className="mt-2 text-amber-800">
                <p className="font-medium">카탈로그에 없는 운동 (저장 누락):</p>
                <ul className="mt-1 list-disc pl-5">
                  {unknownExercises.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-medium text-slate-700">{title}</h2>
      {children}
    </section>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
      {message}
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/coach',
  component: CoachPage,
});
