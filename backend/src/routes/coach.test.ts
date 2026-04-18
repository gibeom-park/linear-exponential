// 라우트 단위 테스트. D1 happy-path 는 E2E (#23 wrangler dev) 로 검증.
// preview: 입력검증 + Gemini 에러 분기 + LLM JSON 검증 분기 + 4개 프로그램 라우팅.

import { afterEach, describe, expect, it, vi } from 'vitest';

import app from '../index.ts';

const VALID_INPUT = {
  programType: 'linear',
  weeks: 6,
  daysPerWeek: 4,
  squat1rmKg: 180,
  bench1rmKg: 130,
  deadlift1rmKg: 220,
  deadliftStance: 'conventional',
};

const VALID_PLAN_RESPONSE = JSON.stringify({
  weeks: [
    {
      week_no: 1,
      days: [
        {
          day_no: 1,
          exercises: [
            { name: '백 스쿼트', sets: [{ set_no: 1, reps: 5, weight_kg: 100, rpe: 7 }] },
          ],
        },
      ],
    },
  ],
});

function postCoach(path: string, body: unknown, env: Record<string, unknown> = {}) {
  return app.request(
    `/api/coach${path}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-3-flash-preview', ...env },
  );
}

function mockGeminiResponse(text: string) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    (async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
        status: 200,
      })) as typeof fetch,
  );
}

describe('POST /api/coach/preview', () => {
  afterEach(() => vi.restoreAllMocks());

  it('잘못된 입력은 400', async () => {
    const res = await postCoach('/preview', { programType: 'linear', weeks: 1 });
    expect(res.status).toBe(400);
  });

  it('GEMINI_API_KEY 누락 시 500', async () => {
    const res = await postCoach('/preview', VALID_INPUT, { GEMINI_API_KEY: undefined });
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: /GEMINI_API_KEY/ });
  });

  it('Gemini HTTP 실패는 502', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (async () => new Response('boom', { status: 500 })) as typeof fetch,
    );
    const res = await postCoach('/preview', VALID_INPUT);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: 'gemini_call_failed' });
  });

  it('LLM 출력이 스키마와 안 맞으면 502', async () => {
    mockGeminiResponse('{"weeks":[{"oops":1}]}');
    const res = await postCoach('/preview', VALID_INPUT);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: 'llm_output_invalid' });
  });

  it('성공 시 plan + model + prompt_version 반환 (DB 미저장)', async () => {
    mockGeminiResponse(VALID_PLAN_RESPONSE);
    const res = await postCoach('/preview', VALID_INPUT);
    expect(res.status).toBe(200);
    const body = await res.json<{ plan: unknown; model: string; prompt_version: number }>();
    expect(body.plan).toMatchObject({ weeks: expect.any(Array) });
    expect(body.model).toBe('gemini-3-flash-preview');
    expect(body.prompt_version).toBe(1);
  });

  for (const programType of ['linear', 'dup', 'block', 'conjugate']) {
    it(`programType=${programType} 에 맞는 프롬프트로 라우팅 (system prompt 본문 확인)`, async () => {
      let captured: { systemInstruction?: { parts?: Array<{ text?: string }> } } | undefined;
      vi.spyOn(globalThis, 'fetch').mockImplementation((async (_url: string, init: RequestInit) => {
        captured = JSON.parse(init.body as string);
        return new Response('{ "candidates": [] }', { status: 200 });
      }) as typeof fetch);

      const res = await postCoach('/preview', { ...VALID_INPUT, programType });
      // candidates 비어있어 502 (gemini_call_failed) 가 정상. 여기선 라우팅만 확인.
      expect(res.status).toBe(502);
      const sys = captured?.systemInstruction?.parts?.[0]?.text ?? '';
      const programLabel = {
        linear: 'Linear Periodization',
        dup: 'DUP',
        block: 'Block Periodization',
        conjugate: 'Conjugate',
      }[programType as 'linear' | 'dup' | 'block' | 'conjugate'];
      expect(sys).toContain(programLabel);
    });
  }
});

describe('POST /api/coach/blocks', () => {
  it('잘못된 input 은 400', async () => {
    const res = await postCoach('/blocks', { input: { programType: 'linear' }, plan: {} });
    expect(res.status).toBe(400);
  });

  it('잘못된 plan 은 400', async () => {
    const res = await postCoach('/blocks', { input: VALID_INPUT, plan: { weeks: 'nope' } });
    expect(res.status).toBe(400);
  });
});
