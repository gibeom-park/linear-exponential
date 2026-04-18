// 컨디션 체크인 (전부 선택). 카드 형태로 접혀 있다가 펼쳐서 입력 → 저장.
// (user, date) upsert 라 같은 날 다시 저장 시 업데이트.

import { useEffect, useState } from 'react';

import type { CheckinInput } from '@linex/shared/validators/api/train';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { CheckinRow } from './types';

interface CheckinFormProps {
  date: string;
  initial: CheckinRow | null;
  onSubmit: (input: CheckinInput) => void;
  isSaving: boolean;
  error: string | null;
}

interface DraftState {
  sleepHours: string;
  conditionScore: string;
  bodyweightKg: string;
  notes: string;
}

function fromInitial(row: CheckinRow | null): DraftState {
  return {
    sleepHours: row?.sleepHours != null ? String(row.sleepHours) : '',
    conditionScore: row?.conditionScore != null ? String(row.conditionScore) : '',
    bodyweightKg: row?.bodyweightKg != null ? String(row.bodyweightKg) : '',
    notes: row?.notes ?? '',
  };
}

export function CheckinForm({ date, initial, onSubmit, isSaving, error }: CheckinFormProps) {
  const hasData = initial !== null;
  const [open, setOpen] = useState(hasData);
  const [draft, setDraft] = useState<DraftState>(() => fromInitial(initial));

  // date 변경 시 초기값 갱신
  useEffect(() => {
    setDraft(fromInitial(initial));
    setOpen(initial !== null);
  }, [initial]);

  const submit = () => {
    const sleep = draft.sleepHours.trim() ? Number(draft.sleepHours) : null;
    const cond = draft.conditionScore.trim() ? Number(draft.conditionScore) : null;
    const bw = draft.bodyweightKg.trim() ? Number(draft.bodyweightKg) : null;
    const notes = draft.notes.trim() ? draft.notes.trim() : null;
    onSubmit({
      date,
      sleepHours: sleep,
      conditionScore: cond,
      bodyweightKg: bw,
      notes,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">
          체크인 {hasData ? <span className="text-xs text-muted-foreground">(저장됨)</span> : null}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? '접기' : '펼치기'}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="sleep">수면 (시간)</Label>
              <Input
                id="sleep"
                type="number"
                inputMode="decimal"
                step="0.5"
                min={0}
                max={24}
                value={draft.sleepHours}
                onChange={(e) => setDraft({ ...draft, sleepHours: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cond">컨디션 (1~5)</Label>
              <Input
                id="cond"
                type="number"
                inputMode="numeric"
                min={1}
                max={5}
                value={draft.conditionScore}
                onChange={(e) => setDraft({ ...draft, conditionScore: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bw">체중 (kg)</Label>
              <Input
                id="bw"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                value={draft.bodyweightKg}
                onChange={(e) => setDraft({ ...draft, bodyweightKg: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ckn-notes">메모</Label>
            <Textarea
              id="ckn-notes"
              maxLength={500}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="min-h-16"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            {error && <span className="text-xs text-destructive">{error}</span>}
            <Button onClick={submit} disabled={isSaving}>
              {isSaving ? '저장 중…' : hasData ? '업데이트' : '저장'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
