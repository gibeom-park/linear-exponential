// 캘린더 + prev/next 버튼. hint 가 있으면 휴식일/블럭외 → 인접 훈련일로 점프.
// 오늘 날짜 빠른 이동 버튼 포함.

import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateNavigatorProps {
  date: string; // YYYY-MM-DD
  onChange: (next: string) => void;
  hint: { prev: string | null; next: string | null } | null;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromIsoDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function shiftDay(iso: string, delta: number): string {
  const d = fromIsoDate(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
}

export function DateNavigator({ date, onChange, hint }: DateNavigatorProps) {
  const today = toIsoDate(new Date());
  const prev = hint?.prev ?? shiftDay(date, -1);
  const next = hint?.next ?? shiftDay(date, 1);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(prev)}
        disabled={hint !== null && hint.prev === null}
        aria-label="이전 훈련일"
      >
        <ChevronLeft />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="font-normal">
            <CalendarIcon />
            {date}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={fromIsoDate(date)}
            onSelect={(d) => {
              if (d) onChange(toIsoDate(d));
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(next)}
        disabled={hint !== null && hint.next === null}
        aria-label="다음 훈련일"
      >
        <ChevronRight />
      </Button>

      <Button variant="ghost" size="sm" onClick={() => onChange(today)} disabled={date === today}>
        오늘
      </Button>
    </div>
  );
}
