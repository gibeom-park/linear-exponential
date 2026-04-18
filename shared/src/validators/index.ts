// drizzle-zod 로 스키마에서 자동 생성. 도메인 검증 추가는 같은 파일에서 .extend / .refine 으로.

import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import {
  exercises,
  programBlocks,
  programSets,
  settings,
  trainingLogs,
  userConditions,
  users,
} from '../schema.ts';

// ---------- raw insert/select schemas ----------

export const userSelectSchema = createSelectSchema(users);
export const userInsertSchema = createInsertSchema(users);

export const settingsSelectSchema = createSelectSchema(settings);
export const settingsInsertSchema = createInsertSchema(settings);

export const exerciseSelectSchema = createSelectSchema(exercises);
export const exerciseInsertSchema = createInsertSchema(exercises);

export const programBlockSelectSchema = createSelectSchema(programBlocks);
export const programBlockInsertSchema = createInsertSchema(programBlocks);

export const programSetSelectSchema = createSelectSchema(programSets);
export const programSetInsertSchema = createInsertSchema(programSets);

export const trainingLogSelectSchema = createSelectSchema(trainingLogs);
export const trainingLogInsertSchema = createInsertSchema(trainingLogs, {
  rpe: (s) => s.rpe.min(1).max(10),
  reps: (s) => s.reps.int().min(0).max(50),
  weightActualKg: (s) => s.weightActualKg.min(0),
  weightPlannedKg: (s) => s.weightPlannedKg.min(0),
});

export const userConditionSelectSchema = createSelectSchema(userConditions);
export const userConditionInsertSchema = createInsertSchema(userConditions, {
  sleepHours: (s) => s.sleepHours.min(0).max(24).optional(),
  conditionScore: (s) => s.conditionScore.int().min(1).max(5).optional(),
  bodyweightKg: (s) => s.bodyweightKg.min(0).optional(),
});

// ---------- API request / domain helpers ----------

export * from './api/index.ts';
