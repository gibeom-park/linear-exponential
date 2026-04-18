import { useState } from 'react';

import type { DeadliftStance, ProgramType } from '@linex/shared/enums';
import type { GenerateBlockInput } from '@linex/shared/validators/api/coach';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  programType: ProgramType;
  loading: boolean;
  onGenerate: (input: GenerateBlockInput) => void;
}

export function BlockGeneratorForm({ programType, loading, onGenerate }: Props) {
  const [weeks, setWeeks] = useState(6);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [squat, setSquat] = useState(180);
  const [bench, setBench] = useState(130);
  const [deadlift, setDeadlift] = useState(220);
  const [stance, setStance] = useState<DeadliftStance>('conventional');
  const [weakPoints, setWeakPoints] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      programType,
      weeks,
      daysPerWeek,
      squat1rmKg: squat,
      bench1rmKg: bench,
      deadlift1rmKg: deadlift,
      deadliftStance: stance,
      weakPoints: weakPoints.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="블럭 길이 (주)">
          <Input
            type="number"
            min={3}
            max={8}
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
          />
        </Field>
        <Field label="주당 훈련 일수">
          <Input
            type="number"
            min={1}
            max={7}
            value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(Number(e.target.value))}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="스쿼트 1RM (kg)">
          <Input
            type="number"
            step={2.5}
            min={0}
            value={squat}
            onChange={(e) => setSquat(Number(e.target.value))}
          />
        </Field>
        <Field label="벤치 1RM (kg)">
          <Input
            type="number"
            step={2.5}
            min={0}
            value={bench}
            onChange={(e) => setBench(Number(e.target.value))}
          />
        </Field>
        <Field label="데드 1RM (kg)">
          <Input
            type="number"
            step={2.5}
            min={0}
            value={deadlift}
            onChange={(e) => setDeadlift(Number(e.target.value))}
          />
        </Field>
      </div>

      <Field label="메인 데드리프트 스탠스">
        <Select value={stance} onValueChange={(v) => setStance(v as DeadliftStance)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="conventional">컨벤셔널</SelectItem>
            <SelectItem value="sumo">스모</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="약점 / 추가 요청 (선택)">
        <Textarea
          rows={3}
          placeholder="예) 락아웃에서 막힘, 주말은 어깨 컨디션 안 좋음 등"
          value={weakPoints}
          onChange={(e) => setWeakPoints(e.target.value)}
        />
      </Field>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Gemini 호출 중…' : '코치에게 제안 받기'}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
