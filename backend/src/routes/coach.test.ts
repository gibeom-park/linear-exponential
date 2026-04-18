// 코치 라우트 단위 테스트 — 입력 검증 / 라우팅 / 에러 분기.
// DB 가 실제로 쓰이는 happy path 는 E2E (`pnpm dev`) 에서 검증.

import { describe, expect, it } from 'vitest';

import { createBlockInputSchema, patchWeekInputSchema } from '@linex/shared/validators/api/coach';

import app from '../index.ts';

const VALID_BLOCK_INPUT = {
  weeks: 6,
  daysPerWeek: 3,
  selectedDays: ['mon', 'wed', 'fri'],
  startDate: '2026-04-20',
  squat1rmKg: 180,
  bench1rmKg: 130,
  deadlift1rmKg: 220,
  deadliftStance: 'conventional',
  notes: null,
  week1: [
    {
      dayNo: 1,
      exercises: [{ exerciseId: 1, sets: [{ setNo: 1, reps: 5, weightKg: 100, rpe: 7 }] }],
    },
    {
      dayNo: 2,
      exercises: [{ exerciseId: 1, sets: [{ setNo: 1, reps: 5, weightKg: 100, rpe: 7 }] }],
    },
    {
      dayNo: 3,
      exercises: [{ exerciseId: 1, sets: [{ setNo: 1, reps: 5, weightKg: 100, rpe: 7 }] }],
    },
  ],
};

function postCoach(path: string, body: unknown) {
  return app.request(`/api/coach${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function patchCoach(path: string, body: unknown) {
  return app.request(`/api/coach${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('createBlockInputSchema (zod)', () => {
  it('정상 입력 통과', () => {
    const r = createBlockInputSchema.safeParse(VALID_BLOCK_INPUT);
    expect(r.success).toBe(true);
  });

  it('selectedDays 길이 ≠ daysPerWeek 면 실패', () => {
    const r = createBlockInputSchema.safeParse({
      ...VALID_BLOCK_INPUT,
      daysPerWeek: 4,
      selectedDays: ['mon', 'wed', 'fri'],
    });
    expect(r.success).toBe(false);
  });

  it('selectedDays 중복 불가', () => {
    const r = createBlockInputSchema.safeParse({
      ...VALID_BLOCK_INPUT,
      selectedDays: ['mon', 'mon', 'fri'],
    });
    expect(r.success).toBe(false);
  });

  it('week1 day 개수 ≠ daysPerWeek 면 실패', () => {
    const r = createBlockInputSchema.safeParse({
      ...VALID_BLOCK_INPUT,
      week1: VALID_BLOCK_INPUT.week1.slice(0, 2),
    });
    expect(r.success).toBe(false);
  });

  it('week1.dayNo 중복 불가', () => {
    const r = createBlockInputSchema.safeParse({
      ...VALID_BLOCK_INPUT,
      week1: [VALID_BLOCK_INPUT.week1[0], VALID_BLOCK_INPUT.week1[0], VALID_BLOCK_INPUT.week1[2]],
    });
    expect(r.success).toBe(false);
  });

  it('week1.dayNo > daysPerWeek 면 실패', () => {
    const r = createBlockInputSchema.safeParse({
      ...VALID_BLOCK_INPUT,
      week1: [
        { ...VALID_BLOCK_INPUT.week1[0], dayNo: 5 },
        VALID_BLOCK_INPUT.week1[1],
        VALID_BLOCK_INPUT.week1[2],
      ],
    });
    expect(r.success).toBe(false);
  });

  it('startDate ISO 형식 강제', () => {
    const r = createBlockInputSchema.safeParse({
      ...VALID_BLOCK_INPUT,
      startDate: '2026/04/20',
    });
    expect(r.success).toBe(false);
  });

  it('weeks 범위 (2~8) 강제', () => {
    expect(createBlockInputSchema.safeParse({ ...VALID_BLOCK_INPUT, weeks: 1 }).success).toBe(
      false,
    );
    expect(createBlockInputSchema.safeParse({ ...VALID_BLOCK_INPUT, weeks: 9 }).success).toBe(
      false,
    );
  });
});

describe('patchWeekInputSchema (zod)', () => {
  it('정상 입력 통과', () => {
    const r = patchWeekInputSchema.safeParse({ days: VALID_BLOCK_INPUT.week1 });
    expect(r.success).toBe(true);
  });

  it('빈 days 배열 실패', () => {
    const r = patchWeekInputSchema.safeParse({ days: [] });
    expect(r.success).toBe(false);
  });
});

describe('POST /api/coach/blocks', () => {
  it('잘못된 입력은 400', async () => {
    const res = await postCoach('/blocks', { weeks: 1 });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/coach/blocks/:id/week/:weekNo', () => {
  it('잘못된 id 는 400', async () => {
    const res = await patchCoach('/blocks/abc/week/1', { days: VALID_BLOCK_INPUT.week1 });
    expect(res.status).toBe(400);
  });

  it('잘못된 입력은 400', async () => {
    const res = await patchCoach('/blocks/1/week/1', { days: [] });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/coach/blocks/:id', () => {
  it('잘못된 id 는 400', async () => {
    const res = await app.request('/api/coach/blocks/abc');
    expect(res.status).toBe(400);
  });
});
