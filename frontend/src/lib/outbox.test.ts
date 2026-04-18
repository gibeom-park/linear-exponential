// outbox 단위 테스트. fake-indexeddb 로 IDB 환경을 메모리에 시뮬레이트.
// 매 테스트마다 새 IndexedDB / 모듈 캐시 리셋.

import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetForTests, count, enqueue, flush, listAll } from './outbox.ts';

beforeEach(async () => {
  // 매 테스트 깨끗한 상태로 시작 — 캐시된 핸들 닫고 DB 삭제
  await _resetForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('linex-outbox');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('outbox', () => {
  it('enqueue → count 1, listAll 반환', async () => {
    await enqueue('checkin', '/api/train/checkin', 'checkin:2026-04-20', { date: '2026-04-20' });
    expect(await count()).toBe(1);
    const all = await listAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.kind).toBe('checkin');
    expect(all[0]?.dedupeKey).toBe('checkin:2026-04-20');
  });

  it('같은 dedupeKey 재 enqueue → LWW (1개만 남음)', async () => {
    await enqueue('sets', '/api/train/sets', 'sets:2026-04-20', { v: 1 });
    await enqueue('sets', '/api/train/sets', 'sets:2026-04-20', { v: 2 });
    await enqueue('sets', '/api/train/sets', 'sets:2026-04-20', { v: 3 });
    expect(await count()).toBe(1);
    const all = await listAll();
    expect((all[0]?.body as { v: number }).v).toBe(3);
  });

  it('서로 다른 dedupeKey 는 누적', async () => {
    await enqueue('sets', '/api/train/sets', 'sets:2026-04-20', {});
    await enqueue('sets', '/api/train/sets', 'sets:2026-04-21', {});
    expect(await count()).toBe(2);
  });

  it('flush: 200 응답 → 큐에서 제거', async () => {
    await enqueue('checkin', '/api/train/checkin', 'checkin:2026-04-20', {});
    const fakeFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const result = await flush(fakeFetch as unknown as typeof fetch);
    expect(result.sent).toBe(1);
    expect(result.remaining).toBe(0);
    expect(await count()).toBe(0);
  });

  it('flush: 4xx → 영구 실패, 큐에서 제거', async () => {
    await enqueue('checkin', '/api/train/checkin', 'checkin:bad', { invalid: true });
    const fakeFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 400 }));
    const result = await flush(fakeFetch as unknown as typeof fetch);
    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(0);
  });

  it('flush: 5xx → 큐에 유지, 그 시점에 멈춤', async () => {
    await enqueue('sets', '/api/train/sets', 'sets:a', {});
    await enqueue('sets', '/api/train/sets', 'sets:b', {});
    const fakeFetch = vi.fn().mockResolvedValue(new Response('err', { status: 503 }));
    const result = await flush(fakeFetch as unknown as typeof fetch);
    expect(result.sent).toBe(0);
    expect(result.remaining).toBe(2);
    expect(fakeFetch).toHaveBeenCalledTimes(1); // 첫 entry 실패 시 break
  });

  it('flush: 네트워크 오류 (throw) → 큐 유지 + break', async () => {
    await enqueue('sets', '/api/train/sets', 'sets:a', {});
    await enqueue('sets', '/api/train/sets', 'sets:b', {});
    const fakeFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await flush(fakeFetch as unknown as typeof fetch);
    expect(result.sent).toBe(0);
    expect(result.remaining).toBe(2);
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });

  it('flush: 첫 entry 200 + 두번째 503 → 1개 sent + 1개 remaining', async () => {
    await enqueue('sets', '/api/train/sets', 'sets:a', {});
    await enqueue('sets', '/api/train/sets', 'sets:b', {});
    const fakeFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('err', { status: 503 }));
    const result = await flush(fakeFetch as unknown as typeof fetch);
    expect(result.sent).toBe(1);
    expect(result.remaining).toBe(1);
  });
});
