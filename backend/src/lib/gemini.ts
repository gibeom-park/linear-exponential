// Gemini REST API 직접 호출 (zero-dep). responseMimeType=application/json 으로
// JSON 출력 강제. 응답 텍스트는 호출자가 Zod 로 parse 한다.

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiCallOptions {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  /** 기본 1 (= 최초 시도 + 1회 재시도). */
  retries?: number;
}

export class GeminiError extends Error {
  override readonly name = 'GeminiError';
  override readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

export async function callGeminiJson(opts: GeminiCallOptions): Promise<unknown> {
  const retries = opts.retries ?? 1;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callOnce(opts);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof GeminiError
    ? lastErr
    : new GeminiError('gemini call failed after retries', lastErr);
}

async function callOnce(opts: GeminiCallOptions): Promise<unknown> {
  const url = `${ENDPOINT}/${encodeURIComponent(opts.model)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': opts.apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: opts.userPrompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new GeminiError(`gemini http ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as GeminiResponse;
  if (data.promptFeedback?.blockReason) {
    throw new GeminiError(`gemini blocked: ${data.promptFeedback.blockReason}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiError('gemini returned empty text', data);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new GeminiError(`gemini JSON parse failed: ${(err as Error).message}`, text);
  }
}

/** 프롬프트 frontmatter 의 model 보다 env GEMINI_MODEL 이 우선. */
export function resolveModel(envModel: string | undefined, frontmatterModel: string): string {
  return (envModel ?? '').trim() || frontmatterModel;
}
