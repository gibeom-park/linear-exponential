// IndexedDB 기반 outbox. 네트워크 실패/오프라인 시 mutation 을 큐에 적재 → 온라인 복귀 시 flush.
// LWW: 같은 dedupeKey 가 큐에 있으면 새 entry 가 기존을 대체 (최신 의도 우선).
// 백엔드는 이미 (user, date) / (program_set_id, date) upsert 라 재전송 안전.

import { type IDBPDatabase, openDB } from 'idb';

const DB_NAME = 'linex-outbox';
const STORE = 'outbox';
const VERSION = 1;

export type OutboxKind = 'checkin' | 'sets';

export interface OutboxEntry {
  id?: number;
  kind: OutboxKind;
  endpoint: string; // POST 대상. /api/train/checkin | /api/train/sets
  dedupeKey: string; // ex: "checkin:2026-04-20", "sets:2026-04-20"
  body: unknown;
  queuedAt: number;
  retries: number;
  lastError?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('dedupeKey', 'dedupeKey', { unique: false });
          store.createIndex('queuedAt', 'queuedAt', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

// 테스트 용 — 모듈 캐시된 db 핸들을 닫고 리셋. deleteDatabase 가 block 되지 않도록.
export async function _resetForTests() {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
  }
  dbPromise = null;
}

export async function enqueue(
  kind: OutboxKind,
  endpoint: string,
  dedupeKey: string,
  body: unknown,
): Promise<number> {
  const db = await getDb();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const idx = store.index('dedupeKey');
  // 같은 dedupeKey 의 기존 entry 제거 (LWW)
  let cursor = await idx.openCursor(IDBKeyRange.only(dedupeKey));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  const id = (await store.add({
    kind,
    endpoint,
    dedupeKey,
    body,
    queuedAt: Date.now(),
    retries: 0,
  } satisfies Omit<OutboxEntry, 'id'>)) as number;
  await tx.done;
  return id;
}

export async function listAll(): Promise<OutboxEntry[]> {
  const db = await getDb();
  const all = (await db.getAllFromIndex(STORE, 'queuedAt')) as OutboxEntry[];
  return all;
}

export async function count(): Promise<number> {
  const db = await getDb();
  return await db.count(STORE);
}

export async function remove(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

async function bumpRetry(id: number, error: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const row = (await store.get(id)) as OutboxEntry | undefined;
  if (row) {
    row.retries += 1;
    row.lastError = error;
    await store.put(row);
  }
  await tx.done;
}

export interface FlushResult {
  sent: number;
  failed: number;
  remaining: number;
}

// 큐의 entry 들을 순차 전송. 네트워크 오류 (TypeError) 면 멈춤 (오프라인 추정).
// 4xx 면 해당 entry retry 카운트 올리고 큐에서 제거 (재전송 무의미).
// 5xx 면 retry 카운트만 올리고 stop (서버 일시 장애).
export async function flush(fetchImpl: typeof fetch = fetch): Promise<FlushResult> {
  let sent = 0;
  let failed = 0;
  const queue = await listAll();
  for (const entry of queue) {
    if (entry.id === undefined) continue;
    try {
      const r = await fetchImpl(entry.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.body),
      });
      if (r.ok) {
        await remove(entry.id);
        sent++;
      } else if (r.status >= 400 && r.status < 500) {
        // 영구 실패 (검증 오류 등) — 큐에서 빼고 카운트만
        await remove(entry.id);
        failed++;
      } else {
        await bumpRetry(entry.id, `HTTP ${r.status}`);
        break;
      }
    } catch (e) {
      await bumpRetry(entry.id, e instanceof Error ? e.message : String(e));
      break;
    }
  }
  const remaining = await count();
  return { sent, failed, remaining };
}
