// 훈련 라우트 단위 테스트 — pure 헬퍼 (date → session) + 입력 검증.
// DB 통합은 E2E (`pnpm dev`) 에서 검증.

import { describe, expect, it } from 'vitest';

import {
  checkinInputSchema,
  sessionLogInputSchema,
  trainDateQuerySchema,
} from '@linex/shared/validators/api/train';

import app from '../index.ts';
import { nearbyPlannedDates, resolveSession } from './train.ts';

// requireUser 단락용 — DB binding 없이 userId 1 로 통과시킨다.
const TEST_ENV = { DEV_USER_EMAIL: 'test@example.com', DEV_USER_ID: 1 };

const BLOCK = {
  // 2026-04-20 (Mon), 6주, 주 3 (월/수/금) → end_date = 2026-05-31
  startDate: '2026-04-20',
  endDate: '2026-05-31',
  weeks: 6,
  selectedDays: ['mon', 'wed', 'fri'] as const,
};

describe('resolveSession', () => {
  it('start date (Mon) → week 1 day 1', () => {
    expect(
      resolveSession({ ...BLOCK, selectedDays: [...BLOCK.selectedDays] }, '2026-04-20'),
    ).toEqual({
      weekNo: 1,
      dayNo: 1,
    });
  });

  it('Wed of week 1 → week 1 day 2', () => {
    expect(
      resolveSession({ ...BLOCK, selectedDays: [...BLOCK.selectedDays] }, '2026-04-22'),
    ).toEqual({
      weekNo: 1,
      dayNo: 2,
    });
  });

  it('Fri of week 2 → week 2 day 3', () => {
    expect(
      resolveSession({ ...BLOCK, selectedDays: [...BLOCK.selectedDays] }, '2026-05-01'),
    ).toEqual({
      weekNo: 2,
      dayNo: 3,
    });
  });

  it('Tue (휴식일) → null', () => {
    expect(
      resolveSession({ ...BLOCK, selectedDays: [...BLOCK.selectedDays] }, '2026-04-21'),
    ).toBeNull();
  });

  it('블럭 시작 전 → null', () => {
    expect(
      resolveSession({ ...BLOCK, selectedDays: [...BLOCK.selectedDays] }, '2026-04-19'),
    ).toBeNull();
  });

  it('블럭 종료 후 → null', () => {
    expect(
      resolveSession({ ...BLOCK, selectedDays: [...BLOCK.selectedDays] }, '2026-06-01'),
    ).toBeNull();
  });

  it('마지막 날 (2026-05-31, Sun) — 휴식일이라 null', () => {
    expect(
      resolveSession({ ...BLOCK, selectedDays: [...BLOCK.selectedDays] }, '2026-05-31'),
    ).toBeNull();
  });

  it('start date 가 selectedDays 가 아닌 경우 (Wed start, [tue, thu])', () => {
    const block = {
      startDate: '2026-04-22', // Wed
      endDate: '2026-05-19',
      weeks: 4,
      selectedDays: ['tue', 'thu'] as const,
    };
    // Wed (start) → 휴식일
    expect(
      resolveSession({ ...block, selectedDays: [...block.selectedDays] }, '2026-04-22'),
    ).toBeNull();
    // 같은 주 Thu (1일차) → week 1 day 2 (selectedDays.indexOf('thu') = 1)
    expect(
      resolveSession({ ...block, selectedDays: [...block.selectedDays] }, '2026-04-23'),
    ).toEqual({ weekNo: 1, dayNo: 2 });
    // 같은 주 Tue (6일차) → week 1 day 1 (selectedDays.indexOf('tue') = 0)
    expect(
      resolveSession({ ...block, selectedDays: [...block.selectedDays] }, '2026-04-28'),
    ).toEqual({ weekNo: 1, dayNo: 1 });
    // 다음 주 Thu → week 2 day 2
    expect(
      resolveSession({ ...block, selectedDays: [...block.selectedDays] }, '2026-04-30'),
    ).toEqual({ weekNo: 2, dayNo: 2 });
  });
});

describe('nearbyPlannedDates', () => {
  it('Tue 에서 시작 → prev=Mon, next=Wed', () => {
    expect(
      nearbyPlannedDates({ ...BLOCK, selectedDays: [...BLOCK.selectedDays] }, '2026-04-21'),
    ).toEqual({
      prev: '2026-04-20',
      next: '2026-04-22',
    });
  });

  it('블럭 시작 직전 → prev=null, next=startDate', () => {
    expect(
      nearbyPlannedDates({ ...BLOCK, selectedDays: [...BLOCK.selectedDays] }, '2026-04-19'),
    ).toEqual({
      prev: null,
      next: '2026-04-20',
    });
  });

  it('블럭 종료 직후 → prev=마지막 훈련일, next=null', () => {
    expect(
      nearbyPlannedDates({ ...BLOCK, selectedDays: [...BLOCK.selectedDays] }, '2026-06-01'),
    ).toEqual({
      prev: '2026-05-29',
      next: null,
    });
  });
});

describe('trainDateQuerySchema', () => {
  it('YYYY-MM-DD 통과', () => {
    expect(trainDateQuerySchema.safeParse({ date: '2026-04-20' }).success).toBe(true);
  });

  it('잘못된 포맷 실패', () => {
    expect(trainDateQuerySchema.safeParse({ date: '2026/04/20' }).success).toBe(false);
    expect(trainDateQuerySchema.safeParse({ date: 'today' }).success).toBe(false);
    expect(trainDateQuerySchema.safeParse({}).success).toBe(false);
  });
});

describe('checkinInputSchema', () => {
  it('date 만 있어도 통과 (모든 필드 optional)', () => {
    expect(checkinInputSchema.safeParse({ date: '2026-04-20' }).success).toBe(true);
  });

  it('정상 입력 통과', () => {
    expect(
      checkinInputSchema.safeParse({
        date: '2026-04-20',
        sleepHours: 7.5,
        conditionScore: 4,
        bodyweightKg: 82.3,
        notes: 'ok',
      }).success,
    ).toBe(true);
  });

  it('conditionScore 1~5 강제', () => {
    expect(checkinInputSchema.safeParse({ date: '2026-04-20', conditionScore: 0 }).success).toBe(
      false,
    );
    expect(checkinInputSchema.safeParse({ date: '2026-04-20', conditionScore: 6 }).success).toBe(
      false,
    );
  });

  it('sleepHours 0~24', () => {
    expect(checkinInputSchema.safeParse({ date: '2026-04-20', sleepHours: -1 }).success).toBe(
      false,
    );
    expect(checkinInputSchema.safeParse({ date: '2026-04-20', sleepHours: 25 }).success).toBe(
      false,
    );
  });
});

describe('sessionLogInputSchema', () => {
  const validSet = {
    programSetId: 1,
    exerciseId: 1,
    reps: 5,
    weightPlannedKg: 100,
    weightActualKg: 100,
    rpe: 7,
  };

  it('정상 입력 통과', () => {
    expect(sessionLogInputSchema.safeParse({ date: '2026-04-20', sets: [validSet] }).success).toBe(
      true,
    );
  });

  it('빈 sets 배열 실패', () => {
    expect(sessionLogInputSchema.safeParse({ date: '2026-04-20', sets: [] }).success).toBe(false);
  });

  it('rpe 1~10', () => {
    expect(
      sessionLogInputSchema.safeParse({
        date: '2026-04-20',
        sets: [{ ...validSet, rpe: 0 }],
      }).success,
    ).toBe(false);
    expect(
      sessionLogInputSchema.safeParse({
        date: '2026-04-20',
        sets: [{ ...validSet, rpe: 11 }],
      }).success,
    ).toBe(false);
  });

  it('weight 음수 거부', () => {
    expect(
      sessionLogInputSchema.safeParse({
        date: '2026-04-20',
        sets: [{ ...validSet, weightActualKg: -5 }],
      }).success,
    ).toBe(false);
  });

  it('weight 110% 초과도 통과 (서버는 ±10% 검증 안 함 — UI 경고만)', () => {
    expect(
      sessionLogInputSchema.safeParse({
        date: '2026-04-20',
        sets: [{ ...validSet, weightPlannedKg: 100, weightActualKg: 200 }],
      }).success,
    ).toBe(true);
  });
});

describe('GET /api/train/day', () => {
  it('date 파라미터 없으면 400', async () => {
    const res = await app.request('/api/train/day', undefined, TEST_ENV);
    expect(res.status).toBe(400);
  });

  it('잘못된 date 포맷은 400', async () => {
    const res = await app.request('/api/train/day?date=2026/04/20', undefined, TEST_ENV);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/train/checkin', () => {
  it('잘못된 입력은 400', async () => {
    const res = await app.request(
      '/api/train/checkin',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditionScore: 4 }), // date 누락
      },
      TEST_ENV,
    );
    expect(res.status).toBe(400);
  });
});

describe('POST /api/train/sets', () => {
  it('잘못된 입력은 400', async () => {
    const res = await app.request(
      '/api/train/sets',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: '2026-04-20', sets: [] }),
      },
      TEST_ENV,
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/train/checkin', () => {
  it('date 파라미터 없으면 400', async () => {
    const res = await app.request('/api/train/checkin', undefined, TEST_ENV);
    expect(res.status).toBe(400);
  });
});
