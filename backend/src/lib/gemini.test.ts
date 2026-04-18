import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GeminiError, callGeminiJson, resolveModel } from './gemini.ts';

const OPTS = {
  apiKey: 'k',
  model: 'gemini-3-flash-preview',
  systemPrompt: 'sys',
  userPrompt: 'usr',
};

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(impl as typeof fetch);
}

describe('callGeminiJson', () => {
  afterEach(() => vi.restoreAllMocks());

  it('정상 응답을 JSON 파싱해 반환', async () => {
    mockFetch(
      async () =>
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"weeks":[]}' }] } }] }),
          { status: 200 },
        ),
    );
    const out = await callGeminiJson({ ...OPTS, retries: 0 });
    expect(out).toEqual({ weeks: [] });
  });

  it('HTTP 실패는 retries 만큼 재시도 후 GeminiError', async () => {
    const fetchSpy = mockFetch(async () => new Response('boom', { status: 500 }));
    await expect(callGeminiJson({ ...OPTS, retries: 1 })).rejects.toBeInstanceOf(GeminiError);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('빈 candidates 도 GeminiError', async () => {
    mockFetch(async () => new Response(JSON.stringify({ candidates: [] }), { status: 200 }));
    await expect(callGeminiJson({ ...OPTS, retries: 0 })).rejects.toBeInstanceOf(GeminiError);
  });

  it('blockReason 응답은 GeminiError', async () => {
    mockFetch(
      async () =>
        new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }), {
          status: 200,
        }),
    );
    await expect(callGeminiJson({ ...OPTS, retries: 0 })).rejects.toThrow(/SAFETY/);
  });

  it('JSON 파싱 실패 후 첫 재시도가 성공하면 통과', async () => {
    let i = 0;
    mockFetch(async () => {
      i++;
      const text = i === 1 ? 'not json' : '{"weeks":[]}';
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
        status: 200,
      });
    });
    const out = await callGeminiJson({ ...OPTS, retries: 1 });
    expect(out).toEqual({ weeks: [] });
  });
});

describe('resolveModel', () => {
  it('env 값이 우선', () => {
    expect(resolveModel('env-model', 'fm-model')).toBe('env-model');
  });
  it('env 가 비어있으면 frontmatter', () => {
    expect(resolveModel(undefined, 'fm-model')).toBe('fm-model');
    expect(resolveModel('', 'fm-model')).toBe('fm-model');
    expect(resolveModel('   ', 'fm-model')).toBe('fm-model');
  });
});
