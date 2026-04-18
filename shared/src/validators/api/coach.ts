import { z } from 'zod';

import { DEADLIFT_STANCE, PROGRAM_TYPE } from '../../enums.ts';
import { llmCoachOutputSchema } from '../llm/coach_output.ts';

export const generateBlockInputSchema = z.object({
  programType: z.enum(PROGRAM_TYPE),
  weeks: z.number().int().min(3).max(8),
  daysPerWeek: z.number().int().min(1).max(7),
  squat1rmKg: z.number().min(0).max(500),
  bench1rmKg: z.number().min(0).max(500),
  deadlift1rmKg: z.number().min(0).max(500),
  deadliftStance: z.enum(DEADLIFT_STANCE),
  weakPoints: z.string().max(500).optional(),
});

export type GenerateBlockInput = z.infer<typeof generateBlockInputSchema>;

// 카드 편집 후 저장: input 메타 + 사용자가 수정한 plan
export const saveBlockInputSchema = z.object({
  input: generateBlockInputSchema,
  plan: llmCoachOutputSchema,
});

export type SaveBlockInput = z.infer<typeof saveBlockInputSchema>;
