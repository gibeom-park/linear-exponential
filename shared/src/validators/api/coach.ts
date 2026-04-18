import { z } from 'zod';

import { DAY_OF_WEEK, DEADLIFT_STANCE } from '../../enums.ts';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식 필요');

export const setInputSchema = z.object({
  setNo: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(50),
  weightKg: z.number().min(0).max(500),
  rpe: z.number().min(1).max(10).nullable().optional(),
});
export type SetInput = z.infer<typeof setInputSchema>;

export const exerciseInputSchema = z.object({
  exerciseId: z.number().int().min(1),
  sets: z.array(setInputSchema).min(1).max(20),
});
export type ExerciseInput = z.infer<typeof exerciseInputSchema>;

export const dayInputSchema = z.object({
  dayNo: z.number().int().min(1).max(7),
  exercises: z.array(exerciseInputSchema).max(20),
});
export type DayInput = z.infer<typeof dayInputSchema>;

export const blockParamsSchema = z.object({
  weeks: z.number().int().min(2).max(8),
  daysPerWeek: z.number().int().min(1).max(7),
  selectedDays: z.array(z.enum(DAY_OF_WEEK)).min(1).max(7),
  startDate: isoDate,
  squat1rmKg: z.number().min(0).max(500),
  bench1rmKg: z.number().min(0).max(500),
  deadlift1rmKg: z.number().min(0).max(500),
  deadliftStance: z.enum(DEADLIFT_STANCE),
  notes: z.string().max(500).nullable().optional(),
});
export type BlockParams = z.infer<typeof blockParamsSchema>;

// Step 1 + Step 2 합본. 주 1 만 받고 백엔드가 N 주로 복제.
export const createBlockInputSchema = blockParamsSchema
  .extend({
    week1: z.array(dayInputSchema).min(1).max(7),
  })
  .superRefine((v, ctx) => {
    if (v.selectedDays.length !== v.daysPerWeek) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedDays'],
        message: 'selectedDays 길이는 daysPerWeek 와 같아야 함',
      });
    }
    const uniqueDays = new Set(v.selectedDays);
    if (uniqueDays.size !== v.selectedDays.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedDays'],
        message: '요일 중복 불가',
      });
    }
    if (v.week1.length !== v.daysPerWeek) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['week1'],
        message: 'week1 day 개수는 daysPerWeek 와 같아야 함',
      });
    }
    const dayNos = new Set<number>();
    for (const [i, d] of v.week1.entries()) {
      if (d.dayNo < 1 || d.dayNo > v.daysPerWeek) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['week1', i, 'dayNo'],
          message: `dayNo 는 1 ~ ${v.daysPerWeek} 범위`,
        });
      }
      if (dayNos.has(d.dayNo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['week1', i, 'dayNo'],
          message: 'dayNo 중복 불가',
        });
      }
      dayNos.add(d.dayNo);
    }
  });
export type CreateBlockInput = z.infer<typeof createBlockInputSchema>;

// 특정 주 sets 통째 교체 (블럭 상세 편집용)
export const patchWeekInputSchema = z.object({
  days: z.array(dayInputSchema).min(1).max(7),
});
export type PatchWeekInput = z.infer<typeof patchWeekInputSchema>;
