import type { ExerciseKind, MuscleGroup, ParentLift } from '@linex/shared/enums';

export interface ExerciseOption {
  id: number;
  name: string;
  kind: ExerciseKind;
  parentLift: ParentLift;
  muscleGroup: MuscleGroup;
}

export interface SetDraft {
  setNo: number;
  reps: number;
  weightKg: number;
  rpe: number | null;
}

export interface ExerciseDraft {
  exerciseId: number;
  sets: SetDraft[];
}

export interface DayDraft {
  dayNo: number;
  exercises: ExerciseDraft[];
}
