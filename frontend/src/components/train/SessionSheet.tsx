// 오늘의 plan + logs 카드. 운동별로 묶고, 각 세트는 planned 옆에 actual + RPE 입력.
// ±10% 가이드는 UI 경고만 (서버 검증 X).
// 저장 → POST /api/train/sets (programSetId+date upsert).

import { useEffect, useMemo, useState } from 'react';

import type { SessionLogInput } from '@linex/shared/validators/api/train';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import type { LoggedSet, PlannedSet } from './types';

interface SessionSheetProps {
  date: string;
  weekNo: number;
  dayNo: number;
  planned: PlannedSet[];
  logs: LoggedSet[];
  onSubmit: (input: SessionLogInput) => void;
  isSaving: boolean;
  saveResult: { inserted: number; updated: number } | null;
  error: string | null;
}

interface RowDraft {
  programSetId: number;
  exerciseId: number;
  exerciseName: string;
  setNo: number;
  plannedReps: number;
  plannedWeightKg: number;
  reps: string;
  weightActualKg: string;
  rpe: string;
}

function buildDrafts(planned: PlannedSet[], logs: LoggedSet[]): RowDraft[] {
  const logByProgramSet = new Map<number, LoggedSet>();
  for (const l of logs) {
    if (l.programSetId !== null) logByProgramSet.set(l.programSetId, l);
  }
  return planned
    .slice()
    .sort((a, b) => a.exerciseId - b.exerciseId || a.setNo - b.setNo)
    .map((p) => {
      const log = logByProgramSet.get(p.id);
      return {
        programSetId: p.id,
        exerciseId: p.exerciseId,
        exerciseName: p.exerciseName,
        setNo: p.setNo,
        plannedReps: p.plannedReps,
        plannedWeightKg: p.plannedWeightKg,
        reps: log ? String(log.reps) : String(p.plannedReps),
        weightActualKg: log ? String(log.weightActualKg) : String(p.plannedWeightKg),
        rpe: log ? String(log.rpe) : '',
      };
    });
}

function groupByExercise(
  rows: RowDraft[],
): Array<{ exerciseId: number; name: string; rows: RowDraft[] }> {
  const groups = new Map<number, { exerciseId: number; name: string; rows: RowDraft[] }>();
  for (const r of rows) {
    const g = groups.get(r.exerciseId);
    if (g) {
      g.rows.push(r);
    } else {
      groups.set(r.exerciseId, { exerciseId: r.exerciseId, name: r.exerciseName, rows: [r] });
    }
  }
  return Array.from(groups.values());
}

function deviationClass(planned: number, actualStr: string): string {
  const a = Number(actualStr);
  if (!Number.isFinite(a) || a <= 0 || planned <= 0) return '';
  const ratio = a / planned;
  if (ratio < 0.9 || ratio > 1.1) return 'text-amber-600 font-semibold';
  return '';
}

function deviationHint(planned: number, actualStr: string): string | null {
  const a = Number(actualStr);
  if (!Number.isFinite(a) || a <= 0 || planned <= 0) return null;
  const pct = ((a - planned) / planned) * 100;
  if (Math.abs(pct) <= 10) return null;
  return `계획 대비 ${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

export function SessionSheet({
  date,
  weekNo,
  dayNo,
  planned,
  logs,
  onSubmit,
  isSaving,
  saveResult,
  error,
}: SessionSheetProps) {
  const [drafts, setDrafts] = useState<RowDraft[]>(() => buildDrafts(planned, logs));

  useEffect(() => {
    setDrafts(buildDrafts(planned, logs));
  }, [planned, logs]);

  const groups = useMemo(() => groupByExercise(drafts), [drafts]);

  const updateRow = (idx: number, patch: Partial<RowDraft>) => {
    setDrafts((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const indexOfRow = (row: RowDraft) =>
    drafts.findIndex((r) => r.programSetId === row.programSetId);

  const canSave =
    drafts.length > 0 &&
    drafts.every((r) => {
      const reps = Number(r.reps);
      const w = Number(r.weightActualKg);
      const rpe = Number(r.rpe);
      return (
        Number.isFinite(reps) &&
        reps >= 0 &&
        reps <= 50 &&
        Number.isFinite(w) &&
        w >= 0 &&
        w <= 500 &&
        Number.isFinite(rpe) &&
        rpe >= 1 &&
        rpe <= 10
      );
    });

  const submit = () => {
    const input: SessionLogInput = {
      date,
      sets: drafts.map((r) => ({
        programSetId: r.programSetId,
        exerciseId: r.exerciseId,
        reps: Number(r.reps),
        weightPlannedKg: r.plannedWeightKg,
        weightActualKg: Number(r.weightActualKg),
        rpe: Number(r.rpe),
      })),
    };
    onSubmit(input);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">
          Week {weekNo} · Day {dayNo}
        </h2>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            이 날짜의 계획된 세트가 없습니다.
          </CardContent>
        </Card>
      )}

      {groups.map((g) => (
        <Card key={g.exerciseId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{g.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[2.5rem_1fr_1fr_5rem] gap-2 pb-2 text-xs text-muted-foreground">
              <span>세트</span>
              <span>Reps (계획 {g.rows[0]?.plannedReps})</span>
              <span>무게 kg</span>
              <span>RPE</span>
            </div>
            <div className="space-y-2">
              {g.rows.map((row) => {
                const idx = indexOfRow(row);
                const wHint = deviationHint(row.plannedWeightKg, row.weightActualKg);
                const wClass = deviationClass(row.plannedWeightKg, row.weightActualKg);
                const repsRowId = `reps-${row.programSetId}`;
                const wRowId = `w-${row.programSetId}`;
                const rpeRowId = `rpe-${row.programSetId}`;
                return (
                  <div key={row.programSetId} className="space-y-1">
                    <div className="grid grid-cols-[2.5rem_1fr_1fr_5rem] items-center gap-2">
                      <span className="text-sm text-muted-foreground">#{row.setNo}</span>
                      <Label htmlFor={repsRowId} className="sr-only">
                        Reps
                      </Label>
                      <Input
                        id={repsRowId}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={50}
                        value={row.reps}
                        onChange={(e) => updateRow(idx, { reps: e.target.value })}
                      />
                      <Label htmlFor={wRowId} className="sr-only">
                        무게
                      </Label>
                      <Input
                        id={wRowId}
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min={0}
                        max={500}
                        value={row.weightActualKg}
                        onChange={(e) => updateRow(idx, { weightActualKg: e.target.value })}
                        className={cn(wClass)}
                      />
                      <Label htmlFor={rpeRowId} className="sr-only">
                        RPE
                      </Label>
                      <Input
                        id={rpeRowId}
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min={1}
                        max={10}
                        value={row.rpe}
                        onChange={(e) => updateRow(idx, { rpe: e.target.value })}
                      />
                    </div>
                    {wHint && (
                      <p className="text-xs text-amber-600">
                        ⚠ 계획 {row.plannedWeightKg}kg → {wHint}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {drafts.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {error && <span className="text-xs text-destructive">{error}</span>}
          {saveResult && (
            <span className="text-xs text-muted-foreground">
              저장됨 (insert {saveResult.inserted} / update {saveResult.updated})
            </span>
          )}
          <Button onClick={submit} disabled={!canSave || isSaving}>
            {isSaving ? '저장 중…' : '세션 저장'}
          </Button>
        </div>
      )}
    </div>
  );
}
