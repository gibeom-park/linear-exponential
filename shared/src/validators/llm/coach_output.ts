import { z } from 'zod';

export const llmCoachSetSchema = z.object({
  set_no: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(50),
  weight_kg: z.number().min(0).max(500),
  rpe: z.number().min(1).max(10).optional(),
});

export const llmCoachExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  sets: z.array(llmCoachSetSchema).min(1).max(20),
});

export const llmCoachDaySchema = z.object({
  day_no: z.number().int().min(1).max(7),
  focus: z.string().max(50).optional(),
  exercises: z.array(llmCoachExerciseSchema).min(1).max(20),
});

export const llmCoachWeekSchema = z.object({
  week_no: z.number().int().min(1).max(20),
  notes: z.string().max(500).optional(),
  days: z.array(llmCoachDaySchema).min(1).max(7),
});

export const llmCoachOutputSchema = z.object({
  weeks: z.array(llmCoachWeekSchema).min(1).max(20),
});

export type LlmCoachSet = z.infer<typeof llmCoachSetSchema>;
export type LlmCoachExercise = z.infer<typeof llmCoachExerciseSchema>;
export type LlmCoachDay = z.infer<typeof llmCoachDaySchema>;
export type LlmCoachWeek = z.infer<typeof llmCoachWeekSchema>;
export type LlmCoachOutput = z.infer<typeof llmCoachOutputSchema>;
