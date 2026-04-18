import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식 필요');

export const trainDateQuerySchema = z.object({
  date: isoDate,
});
export type TrainDateQuery = z.infer<typeof trainDateQuerySchema>;

// POST /api/train/checkin — 같은 (user, date) 면 upsert
export const checkinInputSchema = z.object({
  date: isoDate,
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  conditionScore: z.number().int().min(1).max(5).nullable().optional(),
  bodyweightKg: z.number().min(0).max(500).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});
export type CheckinInput = z.infer<typeof checkinInputSchema>;

// 한 세트의 실제 수행 기록. weightPlannedKg 는 클라이언트가 program_set 에서 가져와서 그대로 함께 보냄 (스냅샷).
// ±10% 가드는 UI 경고만 — 서버는 강제하지 않음 (domain_model.md §6 / Phase 3 결정).
export const setLogInputSchema = z.object({
  programSetId: z.number().int().min(1),
  exerciseId: z.number().int().min(1),
  reps: z.number().int().min(0).max(50),
  weightPlannedKg: z.number().min(0).max(500),
  weightActualKg: z.number().min(0).max(500),
  rpe: z.number().min(1).max(10),
  notes: z.string().max(500).nullable().optional(),
});
export type SetLogInput = z.infer<typeof setLogInputSchema>;

// POST /api/train/sets — 같은 (program_set_id, performed_at:date) 는 upsert (재진입 / 수정).
export const sessionLogInputSchema = z.object({
  date: isoDate,
  sets: z.array(setLogInputSchema).min(1).max(200),
});
export type SessionLogInput = z.infer<typeof sessionLogInputSchema>;
