// 도메인 enum 통합 모듈. domain_model.md / infra_model.md 참조.
// SQLite 에는 enum 타입이 없으므로 Drizzle 컬럼은 text + zod enum 으로 강제한다.

export const DAY_OF_WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayOfWeek = (typeof DAY_OF_WEEK)[number];

export const E1RM_FORMULA = ['epley', 'brzycki', 'lombardi', 'oconner'] as const;
export type E1rmFormula = (typeof E1RM_FORMULA)[number];

export const UNIT_SYSTEM = ['kg', 'lb'] as const;
export type UnitSystem = (typeof UNIT_SYSTEM)[number];

export const DEADLIFT_STANCE = ['conventional', 'sumo'] as const;
export type DeadliftStance = (typeof DEADLIFT_STANCE)[number];

export const EXERCISE_KIND = ['main', 'variation', 'accessory'] as const;
export type ExerciseKind = (typeof EXERCISE_KIND)[number];

export const PARENT_LIFT = ['squat', 'bench', 'deadlift', 'none'] as const;
export type ParentLift = (typeof PARENT_LIFT)[number];

export const MUSCLE_GROUP = [
  'quad',
  'posterior_chain',
  'back',
  'chest',
  'shoulder',
  'triceps',
  'biceps',
  'core',
  'none',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUP)[number];
