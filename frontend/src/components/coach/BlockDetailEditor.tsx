import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import type { DayOfWeek } from '@linex/shared/enums';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { Week1TemplateBuilder } from './Week1TemplateBuilder';
import type { DayDraft, ExerciseOption } from './types';

const DAY_LABEL_KO: Record<DayOfWeek, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

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

interface BlockDetailEditorProps {
  block: BlockShape;
  sets: SetRow[];
  exercises: ExerciseOption[];
}

function setsToWeekDrafts(sets: SetRow[], weekNo: number, selectedDays: DayOfWeek[]): DayDraft[] {
  const byDay = new Map<number, DayDraft>();
  for (let i = 0; i < selectedDays.length; i++) {
    byDay.set(i + 1, { dayNo: i + 1, exercises: [] });
  }
  const sortedSets = [...sets]
    .filter((s) => s.weekNo === weekNo)
    .sort((a, b) => a.dayNo - b.dayNo || a.exerciseId - b.exerciseId || a.setNo - b.setNo);

  for (const s of sortedSets) {
    const day = byDay.get(s.dayNo);
    if (!day) continue;
    let ex = day.exercises.find((e) => e.exerciseId === s.exerciseId);
    if (!ex) {
      ex = { exerciseId: s.exerciseId, sets: [] };
      day.exercises.push(ex);
    }
    ex.sets.push({
      setNo: s.setNo,
      reps: s.plannedReps,
      weightKg: s.plannedWeightKg,
      rpe: s.plannedRpe,
    });
  }
  return [...byDay.values()].sort((a, b) => a.dayNo - b.dayNo);
}

export function BlockDetailEditor({ block, sets, exercises }: BlockDetailEditorProps) {
  const queryClient = useQueryClient();
  const selectedDays = useMemo<DayOfWeek[]>(() => {
    try {
      return JSON.parse(block.selectedDays) as DayOfWeek[];
    } catch {
      return [];
    }
  }, [block.selectedDays]);

  const [activeWeek, setActiveWeek] = useState(1);
  const [drafts, setDrafts] = useState<DayDraft[]>(() => setsToWeekDrafts(sets, 1, selectedDays));

  useEffect(() => {
    setDrafts(setsToWeekDrafts(sets, activeWeek, selectedDays));
  }, [sets, activeWeek, selectedDays]);

  const patchMut = useMutation({
    mutationFn: async (body: { weekNo: number; days: DayDraft[] }) => {
      const r = await fetch(`/api/coach/blocks/${block.id}/week/${body.weekNo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: body.days.map((d) => ({
            dayNo: d.dayNo,
            exercises: d.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              sets: e.sets,
            })),
          })),
        }),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`${r.status}: ${text.slice(0, 200)}`);
      }
      return r.json() as Promise<{ block_id: number; week_no: number; sets_replaced: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block', block.id] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <div className="text-base font-semibold">블럭 #{block.id}</div>
              <div className="text-xs text-muted-foreground">
                {block.startDate} ~ {block.endDate} · 주 {block.daysPerWeek}회 ·{' '}
                {selectedDays.map((d) => DAY_LABEL_KO[d]).join('/')}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              SQ {block.squat1rmKg} · BP {block.bench1rmKg} · DL {block.deadlift1rmKg} (
              {block.deadliftStance === 'sumo' ? '스모' : '컨벤'})
            </div>
          </div>
          {block.notes && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{block.notes}</p>
          )}
        </CardHeader>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: block.weeks }, (_, i) => i + 1).map((w) => (
          <Button
            key={w}
            size="sm"
            variant={w === activeWeek ? 'default' : 'outline'}
            onClick={() => setActiveWeek(w)}
          >
            주 {w}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">주 {activeWeek} 편집</div>
            <Button
              size="sm"
              onClick={() => patchMut.mutate({ weekNo: activeWeek, days: drafts })}
              disabled={patchMut.isPending}
            >
              {patchMut.isPending ? '저장 중…' : `주 ${activeWeek} 저장`}
            </Button>
          </div>
          {patchMut.isError && (
            <p className="text-xs text-destructive">
              저장 실패: {(patchMut.error as Error).message}
            </p>
          )}
          {patchMut.isSuccess && !patchMut.isPending && (
            <p className="text-xs text-emerald-600">저장됨</p>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Week1TemplateBuilder
            selectedDays={selectedDays}
            week1={drafts}
            exercises={exercises}
            onChange={setDrafts}
          />
        </CardContent>
      </Card>
    </div>
  );
}
