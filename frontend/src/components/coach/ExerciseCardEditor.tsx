import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import type { ExerciseDraft, ExerciseOption, SetDraft } from './types';

interface ExerciseCardEditorProps {
  exercise: ExerciseDraft;
  exerciseName: string;
  exercises: ExerciseOption[];
  onChange: (next: ExerciseDraft) => void;
  onRemove: () => void;
}

export function ExerciseCardEditor({
  exercise,
  exerciseName,
  onChange,
  onRemove,
}: ExerciseCardEditorProps) {
  const updateSet = (idx: number, patch: Partial<SetDraft>) => {
    const sets = exercise.sets.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...exercise, sets });
  };

  const removeSet = (idx: number) => {
    if (exercise.sets.length <= 1) return;
    const sets = exercise.sets
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, setNo: i + 1 }));
    onChange({ ...exercise, sets });
  };

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    const next: SetDraft = last
      ? { ...last, setNo: exercise.sets.length + 1 }
      : { setNo: 1, reps: 5, weightKg: 60, rpe: null };
    onChange({ ...exercise, sets: [...exercise.sets, next] });
  };

  return (
    <Card className="gap-3 py-3">
      <CardHeader className="px-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{exerciseName}</div>
          <Button size="icon-xs" variant="ghost" onClick={onRemove} aria-label="운동 제거">
            <Trash2 />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 space-y-1.5">
        <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1.75rem] gap-1 text-[11px] text-muted-foreground">
          <div>#</div>
          <div>회</div>
          <div>kg</div>
          <div>RPE</div>
          <div></div>
        </div>
        {exercise.sets.map((s, i) => (
          <div
            key={i}
            className="grid grid-cols-[2rem_1fr_1fr_1fr_1.75rem] items-center gap-1"
          >
            <div className="text-xs text-muted-foreground">{s.setNo}</div>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              value={Number.isFinite(s.reps) ? s.reps : ''}
              onChange={(e) => updateSet(i, { reps: Number(e.target.value) || 0 })}
              className="h-8 px-2 text-sm"
            />
            <Input
              type="number"
              inputMode="decimal"
              step="0.5"
              min={0}
              max={500}
              value={Number.isFinite(s.weightKg) ? s.weightKg : ''}
              onChange={(e) => updateSet(i, { weightKg: Number(e.target.value) || 0 })}
              className="h-8 px-2 text-sm"
            />
            <Input
              type="number"
              inputMode="decimal"
              step="0.5"
              min={1}
              max={10}
              value={s.rpe ?? ''}
              onChange={(e) =>
                updateSet(i, {
                  rpe: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className="h-8 px-2 text-sm"
              placeholder="—"
            />
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => removeSet(i)}
              aria-label="세트 제거"
              disabled={exercise.sets.length <= 1}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button size="xs" variant="outline" onClick={addSet} className="mt-1">
          + 세트
        </Button>
      </CardContent>
    </Card>
  );
}
