import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { exercises, programBlocks, programSets } from '@linex/shared/schema';
import { createBlockInputSchema, patchWeekInputSchema } from '@linex/shared/validators/api/coach';

import { createDb } from '../lib/db.ts';
import { requireUser } from '../middleware/auth.ts';
import type { AppBindings } from '../types.ts';

// D1 = SQLite, 한 쿼리당 100 변수 제한. program_sets row 당 8 컬럼 → 12 row 씩 청크.
const SETS_INSERT_CHUNK = 12;

function computeEndDate(startDateIso: string, weeks: number): string {
  const start = new Date(`${startDateIso}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + weeks * 7 - 1);
  return start.toISOString().slice(0, 10);
}

export const coachRoute = new Hono<AppBindings>()
  .use('*', requireUser)
  .get('/exercises', async (c) => {
    const db = createDb(c.env.DB);
    const list = await db
      .select({
        id: exercises.id,
        name: exercises.name,
        kind: exercises.kind,
        parentLift: exercises.parentLift,
        muscleGroup: exercises.muscleGroup,
      })
      .from(exercises);
    return c.json({ exercises: list });
  })
  // 수동 코치 모드: Step 1 (블럭 파라미터) + Step 2 (주 1 템플릿) → DB 적재
  // 백엔드가 주 1 을 weeks 만큼 복제해서 program_sets 일괄 insert.
  .post('/blocks', zValidator('json', createBlockInputSchema), async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');
    const db = createDb(c.env.DB);

    const exerciseIds = new Set(input.week1.flatMap((d) => d.exercises.map((e) => e.exerciseId)));
    if (exerciseIds.size > 0) {
      const found = await db.select({ id: exercises.id }).from(exercises);
      const known = new Set(found.map((e) => e.id));
      const missing = [...exerciseIds].filter((id) => !known.has(id));
      if (missing.length > 0) {
        return c.json({ error: 'unknown_exercise_ids', missing }, 400);
      }
    }

    const endDate = computeEndDate(input.startDate, input.weeks);

    await db
      .update(programBlocks)
      .set({ isActive: false })
      .where(and(eq(programBlocks.userId, userId), eq(programBlocks.isActive, true)));

    const inserted = await db
      .insert(programBlocks)
      .values({
        userId: userId,
        weeks: input.weeks,
        daysPerWeek: input.daysPerWeek,
        selectedDays: JSON.stringify(input.selectedDays),
        startDate: input.startDate,
        endDate,
        squat1rmKg: input.squat1rmKg,
        bench1rmKg: input.bench1rmKg,
        deadlift1rmKg: input.deadlift1rmKg,
        deadliftStance: input.deadliftStance,
        notes: input.notes ?? null,
        isActive: true,
      })
      .returning({ id: programBlocks.id });

    const blockId = inserted[0]?.id;
    if (blockId === undefined) {
      return c.json({ error: 'insert_failed' }, 500);
    }

    const setRows: (typeof programSets.$inferInsert)[] = [];
    for (let weekNo = 1; weekNo <= input.weeks; weekNo++) {
      for (const day of input.week1) {
        for (const ex of day.exercises) {
          for (const set of ex.sets) {
            setRows.push({
              blockId,
              weekNo,
              dayNo: day.dayNo,
              exerciseId: ex.exerciseId,
              setNo: set.setNo,
              plannedReps: set.reps,
              plannedWeightKg: set.weightKg,
              plannedRpe: set.rpe ?? null,
            });
          }
        }
      }
    }

    if (setRows.length > 0) {
      for (let i = 0; i < setRows.length; i += SETS_INSERT_CHUNK) {
        await db.insert(programSets).values(setRows.slice(i, i + SETS_INSERT_CHUNK));
      }
    }

    return c.json({ block_id: blockId, sets_inserted: setRows.length, end_date: endDate });
  })
  .get('/blocks/:id', async (c) => {
    const userId = c.get('userId');
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: 'invalid_id' }, 400);
    }
    const db = createDb(c.env.DB);
    const block = await db.select().from(programBlocks).where(eq(programBlocks.id, id)).get();
    if (!block || block.userId !== userId) {
      return c.json({ error: 'not_found' }, 404);
    }
    const sets = await db
      .select({
        id: programSets.id,
        weekNo: programSets.weekNo,
        dayNo: programSets.dayNo,
        setNo: programSets.setNo,
        plannedReps: programSets.plannedReps,
        plannedWeightKg: programSets.plannedWeightKg,
        plannedRpe: programSets.plannedRpe,
        exerciseId: programSets.exerciseId,
        exerciseName: exercises.name,
      })
      .from(programSets)
      .innerJoin(exercises, eq(programSets.exerciseId, exercises.id))
      .where(eq(programSets.blockId, id));

    return c.json({ block, sets });
  })
  // 특정 주 sets 통째 교체. 주 단위 편집용.
  .patch('/blocks/:id/week/:weekNo', zValidator('json', patchWeekInputSchema), async (c) => {
    const userId = c.get('userId');
    const id = Number(c.req.param('id'));
    const weekNo = Number(c.req.param('weekNo'));
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(weekNo) || weekNo <= 0) {
      return c.json({ error: 'invalid_id' }, 400);
    }

    const { days } = c.req.valid('json');
    const db = createDb(c.env.DB);

    const block = await db.select().from(programBlocks).where(eq(programBlocks.id, id)).get();
    if (!block || block.userId !== userId) {
      return c.json({ error: 'not_found' }, 404);
    }
    if (weekNo > block.weeks) {
      return c.json({ error: 'week_out_of_range' }, 400);
    }

    const exerciseIds = new Set(days.flatMap((d) => d.exercises.map((e) => e.exerciseId)));
    if (exerciseIds.size > 0) {
      const found = await db.select({ id: exercises.id }).from(exercises);
      const known = new Set(found.map((e) => e.id));
      const missing = [...exerciseIds].filter((eid) => !known.has(eid));
      if (missing.length > 0) {
        return c.json({ error: 'unknown_exercise_ids', missing }, 400);
      }
    }

    const dayNoSet = new Set(days.map((d) => d.dayNo));
    if (
      dayNoSet.size !== days.length ||
      [...dayNoSet].some((n) => n < 1 || n > block.daysPerWeek)
    ) {
      return c.json({ error: 'invalid_day_no' }, 400);
    }

    await db
      .delete(programSets)
      .where(and(eq(programSets.blockId, id), eq(programSets.weekNo, weekNo)));

    const setRows: (typeof programSets.$inferInsert)[] = [];
    for (const day of days) {
      for (const ex of day.exercises) {
        for (const set of ex.sets) {
          setRows.push({
            blockId: id,
            weekNo,
            dayNo: day.dayNo,
            exerciseId: ex.exerciseId,
            setNo: set.setNo,
            plannedReps: set.reps,
            plannedWeightKg: set.weightKg,
            plannedRpe: set.rpe ?? null,
          });
        }
      }
    }

    if (setRows.length > 0) {
      for (let i = 0; i < setRows.length; i += SETS_INSERT_CHUNK) {
        await db.insert(programSets).values(setRows.slice(i, i + SETS_INSERT_CHUNK));
      }
    }

    return c.json({ block_id: id, week_no: weekNo, sets_replaced: setRows.length });
  });
