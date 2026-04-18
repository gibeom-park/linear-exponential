// /api/train/day 응답의 클라이언트 측 타입. 백엔드 라우트 (backend/src/routes/train.ts) 와 동기 유지.

import type { DayOfWeek } from '@linex/shared/enums';

export interface TrainBlockSummary {
  id: number;
  weeks: number;
  daysPerWeek: number;
  selectedDays: DayOfWeek[];
  startDate: string;
  endDate: string;
}

export interface PlannedSet {
  id: number;
  setNo: number;
  plannedReps: number;
  plannedWeightKg: number;
  plannedRpe: number | null;
  exerciseId: number;
  exerciseName: string;
}

export interface LoggedSet {
  id: number;
  programSetId: number | null;
  exerciseId: number;
  reps: number;
  weightPlannedKg: number;
  weightActualKg: number;
  rpe: number;
  notes: string | null;
  performedAt: string;
}

export interface TrainDayResponse {
  activeBlock: TrainBlockSummary | null;
  date: string;
  planned: {
    weekNo: number;
    dayNo: number;
    sets: PlannedSet[];
  } | null;
  logs: LoggedSet[];
  hint: { prev: string | null; next: string | null } | null;
}

export interface CheckinRow {
  id: number;
  userId: number;
  recordedAt: string;
  sleepHours: number | null;
  conditionScore: number | null;
  bodyweightKg: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckinResponse {
  checkin: CheckinRow | null;
}
