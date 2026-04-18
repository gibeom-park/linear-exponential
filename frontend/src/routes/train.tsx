// 훈련 모드 페이지.
// 캘린더로 날짜 선택 → 그 날 활성 블럭의 plan + logs 표시.
// 휴식일/블럭 외면 hint 카드. 체크인은 선택 (접힌 카드).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createRoute } from '@tanstack/react-router';
import { useState } from 'react';

import type { CheckinInput, SessionLogInput } from '@linex/shared/validators/api/train';

import { CheckinForm } from '@/components/train/CheckinForm';
import { DateNavigator } from '@/components/train/DateNavigator';
import { RestDayHint } from '@/components/train/RestDayHint';
import { SessionSheet } from '@/components/train/SessionSheet';
import type { CheckinResponse, TrainDayResponse } from '@/components/train/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { enqueue } from '@/lib/outbox';
import { useOutboxStatus } from '@/lib/useOutboxStatus';

import { Route as RootRoute } from './__root.tsx';

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function TrainPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState<string>(todayIso());

  const dayKey = ['train', 'day', date] as const;
  const checkinKey = ['train', 'checkin', date] as const;

  // flush 성공 시 현재 날짜의 day/checkin 캐시를 무효화 (서버 반영 결과 즉시 갱신)
  const outbox = useOutboxStatus([dayKey, checkinKey]);

  const dayQ = useQuery({
    queryKey: dayKey,
    queryFn: async () => {
      const r = await fetch(`/api/train/day?date=${date}`);
      if (!r.ok) throw new Error(`day ${r.status}`);
      return (await r.json()) as TrainDayResponse;
    },
  });

  const checkinQ = useQuery({
    queryKey: checkinKey,
    queryFn: async () => {
      const r = await fetch(`/api/train/checkin?date=${date}`);
      if (!r.ok) throw new Error(`checkin ${r.status}`);
      return (await r.json()) as CheckinResponse;
    },
  });

  // 오프라인이거나 fetch 가 네트워크 오류면 outbox 에 enqueue. 백엔드 upsert 라 재전송 안전.
  const checkinMut = useMutation({
    mutationFn: async (body: CheckinInput) => {
      const dedupeKey = `checkin:${body.date}`;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await enqueue('checkin', '/api/train/checkin', dedupeKey, body);
        return { queued: true as const };
      }
      try {
        const r = await fetch('/api/train/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const text = await r.text().catch(() => '');
          throw new Error(`${r.status}: ${text.slice(0, 200)}`);
        }
        return (await r.json()) as { id: number; mode: 'inserted' | 'updated' };
      } catch (e) {
        if (e instanceof TypeError) {
          await enqueue('checkin', '/api/train/checkin', dedupeKey, body);
          return { queued: true as const };
        }
        throw e;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checkinKey });
      void outbox.flushNow();
    },
  });

  const setsMut = useMutation({
    mutationFn: async (body: SessionLogInput) => {
      const dedupeKey = `sets:${body.date}`;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await enqueue('sets', '/api/train/sets', dedupeKey, body);
        return { queued: true as const };
      }
      try {
        const r = await fetch('/api/train/sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const text = await r.text().catch(() => '');
          throw new Error(`${r.status}: ${text.slice(0, 200)}`);
        }
        return (await r.json()) as { inserted: number; updated: number };
      } catch (e) {
        if (e instanceof TypeError) {
          await enqueue('sets', '/api/train/sets', dedupeKey, body);
          return { queued: true as const };
        }
        throw e;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dayKey });
      void outbox.flushNow();
    },
  });

  const day = dayQ.data;
  const checkin = checkinQ.data?.checkin ?? null;

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">훈련 모드</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            날짜 선택 → 체크인 (선택) → 세트 입력. 같은 날 재진입/수정 가능.
          </p>
        </div>
        <Link to="/" className="text-sm text-muted-foreground underline">
          ← 홈
        </Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <DateNavigator date={date} onChange={setDate} hint={day?.hint ?? null} />
        <div className="flex items-center gap-2 text-xs">
          <span
            className={
              outbox.online
                ? 'rounded-full bg-emerald-100 px-2 py-1 text-emerald-700'
                : 'rounded-full bg-amber-100 px-2 py-1 text-amber-800'
            }
          >
            {outbox.online ? '온라인' : '오프라인'}
          </span>
          {outbox.pending > 0 && (
            <>
              <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-700">
                대기 {outbox.pending}건
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void outbox.flushNow()}
                disabled={!outbox.online}
              >
                지금 보내기
              </Button>
            </>
          )}
        </div>
      </div>

      {dayQ.isLoading && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">로딩 중…</CardContent>
        </Card>
      )}

      {dayQ.isError && (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            로드 실패: {(dayQ.error as Error).message}
          </CardContent>
        </Card>
      )}

      {day && day.activeBlock === null && (
        <Card>
          <CardContent className="py-6 text-sm">
            활성 블럭이 없습니다.{' '}
            <Link to="/coach" className="underline">
              /coach
            </Link>{' '}
            에서 먼저 블럭을 만드세요.
          </CardContent>
        </Card>
      )}

      {day?.activeBlock && (
        <CheckinForm
          date={date}
          initial={checkin}
          onSubmit={(input) => checkinMut.mutate(input)}
          isSaving={checkinMut.isPending}
          error={checkinMut.isError ? (checkinMut.error as Error).message : null}
        />
      )}

      {day?.activeBlock && day.planned === null && day.hint && (
        <RestDayHint date={date} hint={day.hint} onJump={setDate} />
      )}

      {day?.activeBlock && day.planned && (
        <SessionSheet
          date={date}
          weekNo={day.planned.weekNo}
          dayNo={day.planned.dayNo}
          planned={day.planned.sets}
          logs={day.logs}
          onSubmit={(input) => setsMut.mutate(input)}
          isSaving={setsMut.isPending}
          saveResult={setsMut.data && 'inserted' in setsMut.data ? setsMut.data : null}
          error={setsMut.isError ? (setsMut.error as Error).message : null}
        />
      )}
    </main>
  );
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/train',
  component: TrainPage,
});
