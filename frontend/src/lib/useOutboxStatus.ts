// 온라인 상태 + outbox 큐 카운트 훅. 'online' 이벤트 시 자동 flush.

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { count, flush } from './outbox.ts';

export interface OutboxStatus {
  online: boolean;
  pending: number;
  flushNow: () => Promise<void>;
}

export function useOutboxStatus(invalidateKeys?: ReadonlyArray<readonly unknown[]>): OutboxStatus {
  const qc = useQueryClient();
  const [online, setOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [pending, setPending] = useState<number>(0);

  const flushNow = async () => {
    const r = await flush();
    if (r.sent > 0 && invalidateKeys) {
      for (const k of invalidateKeys) {
        qc.invalidateQueries({ queryKey: k as unknown[] });
      }
    }
    try {
      setPending(await count());
    } catch {
      setPending(0);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only listener; flushNow re-creates each render but the closure is fine
  useEffect(() => {
    void (async () => {
      try {
        setPending(await count());
      } catch {
        setPending(0);
      }
    })();
    const onOnline = () => {
      setOnline(true);
      void flushNow();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    if (navigator.onLine) void flushNow();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return { online, pending, flushNow };
}
