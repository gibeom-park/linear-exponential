// 훈련 모드 API. domain_model.md §6 + Phase 3 결정 (calendar 기반 nav, 체크인 선택, 같은 날 재진입/수정 허용).
//
// performed_at / recorded_at 은 'YYYY-MM-DD' 만 저장 (날짜 단위 upsert 단순화). 실제 입력 시각은 createdAt/updatedAt 로 추적.
// ±10% 가드는 UI 경고만 — 서버 검증 없음 (도메인 결정).

import { zValidator } from '@hono/zod-validator';
import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';

import { DAY_OF_WEEK, type DayOfWeek } from '@linex/shared/enums';
import {
  exercises,
  programBlocks,
  programSets,
  trainingLogs,
  userConditions,
} from '@linex/shared/schema';
import {
  checkinInputSchema,
  sessionLogInputSchema,
  trainDateQuerySchema,
} from '@linex/shared/validators/api/train';

import { type Db, createDb } from '../lib/db.ts';
import type { AppBindings } from '../types.ts';

const USER_ID = 1;
const LOGS_INSERT_CHUNK = 8; // training_logs 10 컬럼 → 8 row × 10 = 80 < 100

// JS Date.getUTCDay(): 0=Sun, 1=Mon, ..., 6=Sat
const DOW_FROM_INDEX: Record<number, DayOfWeek> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

function dowOf(dateIso: string): DayOfWeek {
  const dow = new Date(`${dateIso}T00:00:00Z`).getUTCDay();
  return DOW_FROM_INDEX[dow] ?? 'sun';
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function addDays(dateIso: string, delta: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

interface ResolvedSession {
  weekNo: number;
  dayNo: number;
}

export function resolveSession(
  block: { startDate: string; endDate: string; weeks: number; selectedDays: DayOfWeek[] },
  date: string,
): ResolvedSession | null {
  if (date < block.startDate || date > block.endDate) return null;
  const diff = daysBetween(block.startDate, date);
  const weekNo = Math.floor(diff / 7) + 1;
  if (weekNo < 1 || weekNo > block.weeks) return null;
  const dayIdx = block.selectedDays.indexOf(dowOf(date));
  if (dayIdx === -1) return null;
  return { weekNo, dayNo: dayIdx + 1 };
}

// 블럭 범위 내에서 date 기준 prev/next 훈련일 (selectedDays) 을 찾는다. 없으면 null.
export function nearbyPlannedDates(
  block: { startDate: string; endDate: string; selectedDays: DayOfWeek[] },
  date: string,
): { prev: string | null; next: string | null } {
  const find = (step: 1 | -1): string | null => {
    let cursor = addDays(date, step);
    while (cursor >= block.startDate && cursor <= block.endDate) {
      if (block.selectedDays.includes(dowOf(cursor))) return cursor;
      cursor = addDays(cursor, step);
    }
    return null;
  };
  return { prev: find(-1), next: find(1) };
}

async function loadActiveBlock(db: Db) {
  const block = await db
    .select()
    .from(programBlocks)
    .where(and(eq(programBlocks.userId, USER_ID), eq(programBlocks.isActive, true)))
    .get();
  if (!block) return null;
  let selectedDays: DayOfWeek[];
  try {
    const parsed = JSON.parse(block.selectedDays);
    selectedDays = Array.isArray(parsed)
      ? (parsed.filter((d): d is DayOfWeek => DAY_OF_WEEK.includes(d)) as DayOfWeek[])
      : [];
  } catch {
    selectedDays = [];
  }
  return { ...block, selectedDays };
}

export const trainRoute = new Hono<AppBindings>()
  // 캘린더 selected date 의 plan + logs. 휴식일/블럭 외면 인접 훈련일 hint 반환.
  .get('/day', zValidator('query', trainDateQuerySchema), async (c) => {
    const { date } = c.req.valid('query');
    const db = createDb(c.env.DB);

    const block = await loadActiveBlock(db);
    if (!block) {
      return c.json({ activeBlock: null, date, planned: null, logs: [], hint: null });
    }

    const blockSummary = {
      id: block.id,
      weeks: block.weeks,
      daysPerWeek: block.daysPerWeek,
      selectedDays: block.selectedDays,
      startDate: block.startDate,
      endDate: block.endDate,
    };

    const session = resolveSession(block, date);
    if (!session) {
      return c.json({
        activeBlock: blockSummary,
        date,
        planned: null,
        logs: [],
        hint: nearbyPlannedDates(block, date),
      });
    }

    const sets = await db
      .select({
        id: programSets.id,
        setNo: programSets.setNo,
        plannedReps: programSets.plannedReps,
        plannedWeightKg: programSets.plannedWeightKg,
        plannedRpe: programSets.plannedRpe,
        exerciseId: programSets.exerciseId,
        exerciseName: exercises.name,
      })
      .from(programSets)
      .innerJoin(exercises, eq(programSets.exerciseId, exercises.id))
      .where(
        and(
          eq(programSets.blockId, block.id),
          eq(programSets.weekNo, session.weekNo),
          eq(programSets.dayNo, session.dayNo),
        ),
      );

    const logs = await db
      .select({
        id: trainingLogs.id,
        programSetId: trainingLogs.programSetId,
        exerciseId: trainingLogs.exerciseId,
        reps: trainingLogs.reps,
        weightPlannedKg: trainingLogs.weightPlannedKg,
        weightActualKg: trainingLogs.weightActualKg,
        rpe: trainingLogs.rpe,
        notes: trainingLogs.notes,
        performedAt: trainingLogs.performedAt,
      })
      .from(trainingLogs)
      .where(and(eq(trainingLogs.userId, USER_ID), eq(trainingLogs.performedAt, date)));

    return c.json({
      activeBlock: blockSummary,
      date,
      planned: {
        weekNo: session.weekNo,
        dayNo: session.dayNo,
        sets,
      },
      logs,
      hint: null,
    });
  })

  .get('/checkin', zValidator('query', trainDateQuerySchema), async (c) => {
    const { date } = c.req.valid('query');
    const db = createDb(c.env.DB);
    const row = await db
      .select()
      .from(userConditions)
      .where(and(eq(userConditions.userId, USER_ID), eq(userConditions.recordedAt, date)))
      .get();
    return c.json({ checkin: row ?? null });
  })

  .post('/checkin', zValidator('json', checkinInputSchema), async (c) => {
    const input = c.req.valid('json');
    const db = createDb(c.env.DB);

    const existing = await db
      .select({ id: userConditions.id })
      .from(userConditions)
      .where(and(eq(userConditions.userId, USER_ID), eq(userConditions.recordedAt, input.date)))
      .get();

    if (existing) {
      await db
        .update(userConditions)
        .set({
          sleepHours: input.sleepHours ?? null,
          conditionScore: input.conditionScore ?? null,
          bodyweightKg: input.bodyweightKg ?? null,
          notes: input.notes ?? null,
          updatedAt: sql`(CURRENT_TIMESTAMP)`,
        })
        .where(eq(userConditions.id, existing.id));
      return c.json({ id: existing.id, mode: 'updated' });
    }

    const inserted = await db
      .insert(userConditions)
      .values({
        userId: USER_ID,
        recordedAt: input.date,
        sleepHours: input.sleepHours ?? null,
        conditionScore: input.conditionScore ?? null,
        bodyweightKg: input.bodyweightKg ?? null,
        notes: input.notes ?? null,
      })
      .returning({ id: userConditions.id });

    return c.json({ id: inserted[0]?.id, mode: 'inserted' });
  })

  // 한 세션의 세트들을 일괄 upsert. 같은 (program_set_id, performed_at:date) 면 update.
  .post('/sets', zValidator('json', sessionLogInputSchema), async (c) => {
    const { date, sets } = c.req.valid('json');
    const db = createDb(c.env.DB);

    if (sets.length === 0) {
      return c.json({ inserted: 0, updated: 0 });
    }

    // exercise_id / program_set_id 존재성 검증 (참조 무결성)
    const programSetIds = [...new Set(sets.map((s) => s.programSetId))];
    const knownProgramSets = await db
      .select({ id: programSets.id, exerciseId: programSets.exerciseId })
      .from(programSets);
    const knownProgramSetMap = new Map(knownProgramSets.map((r) => [r.id, r.exerciseId] as const));
    const missingProgramSets = programSetIds.filter((id) => !knownProgramSetMap.has(id));
    if (missingProgramSets.length > 0) {
      return c.json({ error: 'unknown_program_set_ids', missing: missingProgramSets }, 400);
    }
    for (const s of sets) {
      const expected = knownProgramSetMap.get(s.programSetId);
      if (expected !== s.exerciseId) {
        return c.json({ error: 'exercise_id_mismatch', programSetId: s.programSetId }, 400);
      }
    }

    // 같은 날, 동일 program_set_id 의 기존 로그 일괄 조회 → upsert 분기
    const existingByProgramSetId = new Map<number, number>();
    const existingRows = await db
      .select({ id: trainingLogs.id, programSetId: trainingLogs.programSetId })
      .from(trainingLogs)
      .where(and(eq(trainingLogs.userId, USER_ID), eq(trainingLogs.performedAt, date)));
    for (const r of existingRows) {
      if (r.programSetId !== null) existingByProgramSetId.set(r.programSetId, r.id);
    }

    let updated = 0;
    const toInsert: (typeof trainingLogs.$inferInsert)[] = [];
    for (const s of sets) {
      const existingId = existingByProgramSetId.get(s.programSetId);
      if (existingId !== undefined) {
        await db
          .update(trainingLogs)
          .set({
            reps: s.reps,
            weightPlannedKg: s.weightPlannedKg,
            weightActualKg: s.weightActualKg,
            rpe: s.rpe,
            notes: s.notes ?? null,
            updatedAt: sql`(CURRENT_TIMESTAMP)`,
          })
          .where(eq(trainingLogs.id, existingId));
        updated++;
      } else {
        toInsert.push({
          userId: USER_ID,
          programSetId: s.programSetId,
          exerciseId: s.exerciseId,
          performedAt: date,
          reps: s.reps,
          weightPlannedKg: s.weightPlannedKg,
          weightActualKg: s.weightActualKg,
          rpe: s.rpe,
          notes: s.notes ?? null,
        });
      }
    }

    for (let i = 0; i < toInsert.length; i += LOGS_INSERT_CHUNK) {
      await db.insert(trainingLogs).values(toInsert.slice(i, i + LOGS_INSERT_CHUNK));
    }

    return c.json({ inserted: toInsert.length, updated });
  });
