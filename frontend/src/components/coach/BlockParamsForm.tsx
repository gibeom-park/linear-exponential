import { CalendarIcon } from 'lucide-react';
import { useMemo } from 'react';

import { DAY_OF_WEEK, DEADLIFT_STANCE } from '@linex/shared/enums';
import type { DayOfWeek, DeadliftStance } from '@linex/shared/enums';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const DAY_LABEL_KO: Record<DayOfWeek, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

const STANCE_LABEL: Record<DeadliftStance, string> = {
  conventional: '컨벤셔널',
  sumo: '스모',
};

export interface BlockParamsValue {
  weeks: number;
  selectedDays: DayOfWeek[];
  startDate: string; // YYYY-MM-DD
  squat1rmKg: number;
  bench1rmKg: number;
  deadlift1rmKg: number;
  deadliftStance: DeadliftStance;
  notes: string;
}

interface BlockParamsFormProps {
  value: BlockParamsValue;
  onChange: (next: BlockParamsValue) => void;
  onNext: () => void;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromIsoDate(iso: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const parts = iso.split('-').map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  return new Date(y, m - 1, d);
}

function computeEndDate(startIso: string, weeks: number): string | null {
  const start = fromIsoDate(startIso);
  if (!start) return null;
  const end = new Date(start);
  end.setDate(end.getDate() + weeks * 7 - 1);
  return toIsoDate(end);
}

export function BlockParamsForm({ value, onChange, onNext }: BlockParamsFormProps) {
  const endDate = useMemo(
    () => computeEndDate(value.startDate, value.weeks),
    [value.startDate, value.weeks],
  );

  const toggleDay = (d: DayOfWeek, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...value.selectedDays, d]))
      : value.selectedDays.filter((x) => x !== d);
    // 요일 순서는 DAY_OF_WEEK 기준으로 정렬
    const sorted = DAY_OF_WEEK.filter((x) => next.includes(x));
    onChange({ ...value, selectedDays: sorted });
  };

  const valid =
    value.weeks >= 2 &&
    value.weeks <= 8 &&
    value.selectedDays.length >= 1 &&
    value.selectedDays.length <= 7 &&
    !!fromIsoDate(value.startDate) &&
    value.squat1rmKg > 0 &&
    value.bench1rmKg > 0 &&
    value.deadlift1rmKg > 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="weeks">기간 (주)</Label>
          <Input
            id="weeks"
            type="number"
            inputMode="numeric"
            min={2}
            max={8}
            value={value.weeks}
            onChange={(e) =>
              onChange({ ...value, weeks: Math.max(2, Math.min(8, Number(e.target.value) || 2)) })
            }
          />
          <p className="text-xs text-muted-foreground">2~8 주</p>
        </div>

        <div className="space-y-1.5">
          <Label>주 N 회 (요일 선택)</Label>
          <div className="flex flex-wrap gap-3 rounded-md border bg-card px-3 py-2">
            {DAY_OF_WEEK.map((d) => {
              const checked = value.selectedDays.includes(d);
              return (
                <label key={d} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => toggleDay(d, v === true)}
                  />
                  <span>{DAY_LABEL_KO[d]}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            선택한 요일 수 = 주 {value.selectedDays.length}회
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>시작일</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal">
                <CalendarIcon />
                {value.startDate || '날짜 선택'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={fromIsoDate(value.startDate)}
                onSelect={(d) => {
                  if (d) onChange({ ...value, startDate: toIsoDate(d) });
                }}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label>종료일 (자동 계산)</Label>
          <Input value={endDate ?? '—'} readOnly disabled />
          <p className="text-xs text-muted-foreground">시작일 + {value.weeks}주 - 1일</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="sq">스쿼트 1RM (kg)</Label>
          <Input
            id="sq"
            type="number"
            inputMode="decimal"
            step="0.5"
            value={value.squat1rmKg || ''}
            onChange={(e) => onChange({ ...value, squat1rmKg: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp">벤치 1RM (kg)</Label>
          <Input
            id="bp"
            type="number"
            inputMode="decimal"
            step="0.5"
            value={value.bench1rmKg || ''}
            onChange={(e) => onChange({ ...value, bench1rmKg: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dl">데드 1RM (kg)</Label>
          <Input
            id="dl"
            type="number"
            inputMode="decimal"
            step="0.5"
            value={value.deadlift1rmKg || ''}
            onChange={(e) => onChange({ ...value, deadlift1rmKg: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>데드리프트 스탠스</Label>
          <Select
            value={value.deadliftStance}
            onValueChange={(v) => onChange({ ...value, deadliftStance: v as DeadliftStance })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEADLIFT_STANCE.map((s) => (
                <SelectItem key={s} value={s}>
                  {STANCE_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">메모 (선택)</Label>
          <Textarea
            id="notes"
            value={value.notes}
            maxLength={500}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
            placeholder="블럭 의도, 목표, 컨디션 메모 등"
            className="min-h-20"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!valid}>
          다음 → 주 1 템플릿
        </Button>
      </div>
    </div>
  );
}
