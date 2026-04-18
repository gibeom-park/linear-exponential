// Drizzle 스키마. D1 (SQLite) 대상. infra_model.md §1, §3 / domain_model.md 참조.
// 모든 도메인 테이블에 user_id FK (B1 절충형). 단일 유저 시작이지만 멀티 유저 마이그레이션 0.

import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import {
  DEADLIFT_STANCE,
  E1RM_FORMULA,
  EXERCISE_KIND,
  MUSCLE_GROUP,
  PARENT_LIFT,
  UNIT_SYSTEM,
} from './enums.ts';

const timestamps = {
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
};

// ---------- users ----------

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email'),
  ...timestamps,
});

// ---------- settings (per-user, single row in single-user mode) ----------

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  unitSystem: text('unit_system', { enum: UNIT_SYSTEM }).notNull().default('kg'),
  e1rmFormula: text('e1rm_formula', { enum: E1RM_FORMULA }).notNull().default('epley'),
  mainDeadliftStance: text('main_deadlift_stance', { enum: DEADLIFT_STANCE })
    .notNull()
    .default('conventional'),
  ...timestamps,
});

// ---------- exercises (catalog, shared across users) ----------

export const exercises = sqliteTable(
  'exercises',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    kind: text('kind', { enum: EXERCISE_KIND }).notNull(),
    parentLift: text('parent_lift', { enum: PARENT_LIFT }).notNull().default('none'),
    muscleGroup: text('muscle_group', { enum: MUSCLE_GROUP }).notNull().default('none'),
    notes: text('notes'),
    ...timestamps,
  },
  (table) => ({
    nameUnique: uniqueIndex('exercises_name_unique').on(table.name),
  }),
);

// ---------- program_blocks (수동 코치 모드로 만든 한 사이클) ----------

export const programBlocks = sqliteTable('program_blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  weeks: integer('weeks').notNull(),
  daysPerWeek: integer('days_per_week').notNull(),
  // 사용자가 선택한 요일 — JSON 문자열, 예) ["mon","wed","fri"]. 길이 = daysPerWeek
  selectedDays: text('selected_days').notNull(),
  // 시작/종료일 (ISO YYYY-MM-DD). endDate = startDate + weeks*7 - 1
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  // 1RM 입력 (kg canonical)
  squat1rmKg: real('squat_1rm_kg').notNull(),
  bench1rmKg: real('bench_1rm_kg').notNull(),
  deadlift1rmKg: real('deadlift_1rm_kg').notNull(),
  deadliftStance: text('deadlift_stance', { enum: DEADLIFT_STANCE }).notNull(),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
});

// ---------- program_sets (블럭이 펼쳐낸 계획 세트) ----------

export const programSets = sqliteTable('program_sets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  blockId: integer('block_id')
    .notNull()
    .references(() => programBlocks.id, { onDelete: 'cascade' }),
  weekNo: integer('week_no').notNull(),
  dayNo: integer('day_no').notNull(),
  exerciseId: integer('exercise_id')
    .notNull()
    .references(() => exercises.id),
  setNo: integer('set_no').notNull(),
  plannedReps: integer('planned_reps').notNull(),
  plannedWeightKg: real('planned_weight_kg').notNull(),
  plannedRpe: real('planned_rpe'),
  ...timestamps,
});

// ---------- training_logs (실제 수행 기록) ----------

export const trainingLogs = sqliteTable('training_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  programSetId: integer('program_set_id').references(() => programSets.id, {
    onDelete: 'set null',
  }),
  exerciseId: integer('exercise_id')
    .notNull()
    .references(() => exercises.id),
  performedAt: text('performed_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  reps: integer('reps').notNull(),
  weightPlannedKg: real('weight_planned_kg').notNull(),
  weightActualKg: real('weight_actual_kg').notNull(),
  rpe: real('rpe').notNull(),
  notes: text('notes'),
  ...timestamps,
});

// ---------- user_conditions (세션 시작 전 체크인) ----------

export const userConditions = sqliteTable('user_conditions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  recordedAt: text('recorded_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  sleepHours: real('sleep_hours'),
  conditionScore: integer('condition_score'), // 1~5
  bodyweightKg: real('bodyweight_kg'),
  notes: text('notes'),
  ...timestamps,
});

// ---------- inferred types ----------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type ProgramBlock = typeof programBlocks.$inferSelect;
export type NewProgramBlock = typeof programBlocks.$inferInsert;
export type ProgramSet = typeof programSets.$inferSelect;
export type NewProgramSet = typeof programSets.$inferInsert;
export type TrainingLog = typeof trainingLogs.$inferSelect;
export type NewTrainingLog = typeof trainingLogs.$inferInsert;
export type UserCondition = typeof userConditions.$inferSelect;
export type NewUserCondition = typeof userConditions.$inferInsert;
