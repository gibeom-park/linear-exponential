import type { ProgramType } from '@linex/shared/enums';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProgramTypeMeta {
  type: ProgramType;
  label: string;
  oneLiner: string;
}

// docs/periodization_models.md UI 한 줄 설명
const PROGRAM_TYPES: ProgramTypeMeta[] = [
  {
    type: 'linear',
    label: 'Linear',
    oneLiner: '주차가 갈수록 무게는 ↑, 볼륨은 ↓ 단순하고 예측 가능.',
  },
  {
    type: 'dup',
    label: 'DUP',
    oneLiner: '한 주 안에서 매 세션 강도/볼륨을 다르게. 다양한 자극.',
  },
  {
    type: 'block',
    label: 'Block',
    oneLiner: '3~4주 단위 블럭으로 한 가지 목표에 집중. 시합 사이클에 최적.',
  },
  {
    type: 'conjugate',
    label: 'Conjugate',
    oneLiner: 'Max-Effort + Dynamic-Effort 분리. 변형 운동 풀이 커야 함.',
  },
];

interface Props {
  selected: ProgramType | null;
  onSelect: (type: ProgramType) => void;
}

export function ProgramTypeCards({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {PROGRAM_TYPES.map((p) => (
        <button key={p.type} type="button" onClick={() => onSelect(p.type)} className="text-left">
          <Card
            className={cn(
              'h-full cursor-pointer transition-shadow hover:shadow-md',
              selected === p.type && 'ring-2 ring-slate-900',
            )}
          >
            <CardHeader>
              <CardTitle>{p.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{p.oneLiner}</p>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
