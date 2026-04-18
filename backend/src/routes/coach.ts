import { zValidator } from '@hono/zod-validator';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { exercises, programBlocks, programSets } from '@linex/shared/schema';
import { generateBlockInputSchema, saveBlockInputSchema } from '@linex/shared/validators/api/coach';
import { llmCoachOutputSchema } from '@linex/shared/validators/llm/coach_output';

import { PROMPTS, type PromptId } from '../../prompts/generated.ts';
import { hashPrompt, parsePrompt, render } from '../../prompts/lib/render.ts';
import { createDb } from '../lib/db.ts';
import { GeminiError, callGeminiJson, resolveModel } from '../lib/gemini.ts';
import type { AppBindings } from '../types.ts';

// 단일 유저 가정 — infra_model.md §1
const USER_ID = 1;

const PROGRAM_TYPE_TO_PROMPT: Record<string, PromptId> = {
  linear: 'coach_linear',
  dup: 'coach_dup',
  block: 'coach_block',
  conjugate: 'coach_conjugate',
};

function resolvePrompt(programType: string) {
  const promptId = PROGRAM_TYPE_TO_PROMPT[programType];
  const promptText = promptId ? PROMPTS[promptId] : undefined;
  if (!promptId || !promptText) return null;
  return parsePrompt(promptText);
}

export const coachRoute = new Hono<AppBindings>()
  // LLM 으로 plan 제안만 받음 (DB 미저장). 사용자 카드 편집을 위한 1단계.
  .post('/preview', zValidator('json', generateBlockInputSchema), async (c) => {
    const input = c.req.valid('json');
    const apiKey = c.env.GEMINI_API_KEY;
    if (!apiKey) {
      return c.json({ error: 'GEMINI_API_KEY 미설정' }, 500);
    }

    const file = resolvePrompt(input.programType);
    if (!file) {
      return c.json({ error: `unknown programType: ${input.programType}` }, 400);
    }

    const rendered = render(file, {
      weeks: input.weeks,
      days_per_week: input.daysPerWeek,
      squat_1rm: input.squat1rmKg,
      bench_1rm: input.bench1rmKg,
      deadlift_1rm: input.deadlift1rmKg,
      deadlift_stance: input.deadliftStance,
      weak_points: input.weakPoints?.trim() || '없음',
    });

    const model = resolveModel(c.env.GEMINI_MODEL, file.metadata.model);

    let raw: unknown;
    try {
      raw = await callGeminiJson({
        apiKey,
        model,
        systemPrompt: rendered.system,
        userPrompt: rendered.user,
      });
    } catch (err) {
      const msg = err instanceof GeminiError ? err.message : 'gemini 실패';
      return c.json({ error: 'gemini_call_failed', detail: msg }, 502);
    }

    const parsed = llmCoachOutputSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: 'llm_output_invalid', detail: parsed.error.flatten() }, 502);
    }

    return c.json({ plan: parsed.data, model, prompt_version: file.metadata.version });
  })
  // 사용자가 카드에서 편집한 plan 을 저장. 활성 블럭 토글.
  .post('/blocks', zValidator('json', saveBlockInputSchema), async (c) => {
    const { input, plan } = c.req.valid('json');

    const file = resolvePrompt(input.programType);
    if (!file) {
      return c.json({ error: `unknown programType: ${input.programType}` }, 400);
    }
    const promptHash = await hashPrompt(file);

    const db = createDb(c.env.DB);
    const catalog = await db.select({ id: exercises.id, name: exercises.name }).from(exercises);
    const nameToId = new Map(catalog.map((e) => [e.name, e.id]));

    await db
      .update(programBlocks)
      .set({ isActive: false })
      .where(and(eq(programBlocks.userId, USER_ID), eq(programBlocks.isActive, true)));

    const inserted = await db
      .insert(programBlocks)
      .values({
        userId: USER_ID,
        programType: input.programType,
        weeks: input.weeks,
        daysPerWeek: input.daysPerWeek,
        squat1rmKg: input.squat1rmKg,
        bench1rmKg: input.bench1rmKg,
        deadlift1rmKg: input.deadlift1rmKg,
        isActive: true,
        promptVersion: file.metadata.version,
        promptHash,
        rawPlan: plan,
      })
      .returning({ id: programBlocks.id });

    const blockId = inserted[0]?.id;
    if (blockId === undefined) {
      return c.json({ error: 'insert_failed' }, 500);
    }

    const setRows: (typeof programSets.$inferInsert)[] = [];
    const unknownExercises = new Set<string>();
    for (const week of plan.weeks) {
      for (const day of week.days) {
        for (const ex of day.exercises) {
          const exerciseId = nameToId.get(ex.name);
          if (exerciseId === undefined) {
            unknownExercises.add(ex.name);
            continue;
          }
          for (const set of ex.sets) {
            setRows.push({
              blockId,
              weekNo: week.week_no,
              dayNo: day.day_no,
              exerciseId,
              setNo: set.set_no,
              plannedReps: set.reps,
              plannedWeightKg: set.weight_kg,
              plannedRpe: set.rpe ?? null,
            });
          }
        }
      }
    }

    if (setRows.length > 0) {
      // D1 = SQLite, 한 쿼리당 100 변수 제한. row 당 8 필드 → 12 row 씩 끊는다.
      const CHUNK = 12;
      for (let i = 0; i < setRows.length; i += CHUNK) {
        await db.insert(programSets).values(setRows.slice(i, i + CHUNK));
      }
    }

    return c.json({
      block_id: blockId,
      sets_inserted: setRows.length,
      unknown_exercises: [...unknownExercises],
    });
  })
  // 운동 카탈로그 — 카드 편집 시 운동 추가 드롭다운에 사용
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
  .get('/blocks/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return c.json({ error: 'invalid_id' }, 400);
    }
    const db = createDb(c.env.DB);
    const block = await db.select().from(programBlocks).where(eq(programBlocks.id, id)).get();
    if (!block || block.userId !== USER_ID) {
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
  });
