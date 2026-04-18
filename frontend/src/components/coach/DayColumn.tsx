import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { ExerciseCardEditor } from './ExerciseCardEditor';
import { ExercisePicker } from './ExercisePicker';
import type { DayDraft, ExerciseDraft, ExerciseOption } from './types';

interface DayColumnProps {
  day: DayDraft;
  label: string;
  exercises: ExerciseOption[];
  onChange: (next: DayDraft) => void;
}

export function DayColumn({ day, label, exercises, onChange }: DayColumnProps) {
  const [picking, setPicking] = useState(false);
  const exerciseMap = new Map(exercises.map((e) => [e.id, e.name] as const));

  const updateExercise = (idx: number, next: ExerciseDraft) => {
    onChange({
      ...day,
      exercises: day.exercises.map((e, i) => (i === idx ? next : e)),
    });
  };

  const removeExercise = (idx: number) => {
    onChange({ ...day, exercises: day.exercises.filter((_, i) => i !== idx) });
  };

  const addExercise = (id: number) => {
    const draft: ExerciseDraft = {
      exerciseId: id,
      sets: [{ setNo: 1, reps: 5, weightKg: 60, rpe: null }],
    };
    onChange({ ...day, exercises: [...day.exercises, draft] });
    setPicking(false);
  };

  return (
    <Card className="gap-3 py-3">
      <CardHeader className="px-3">
        <div className="text-sm font-semibold">{label}</div>
      </CardHeader>
      <CardContent className="px-3 space-y-2">
        {day.exercises.map((ex, i) => (
          <ExerciseCardEditor
            key={i}
            exercise={ex}
            exerciseName={exerciseMap.get(ex.exerciseId) ?? `#${ex.exerciseId}`}
            exercises={exercises}
            onChange={(next) => updateExercise(i, next)}
            onRemove={() => removeExercise(i)}
          />
        ))}

        {picking ? (
          <ExercisePicker
            exercises={exercises}
            excludeIds={day.exercises.map((e) => e.exerciseId)}
            onPick={addExercise}
            onCancel={() => setPicking(false)}
          />
        ) : (
          <Button size="sm" variant="outline" onClick={() => setPicking(true)} className="w-full">
            + 운동 추가
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
