import { useMemo, useState } from 'react';

import type { ExerciseKind, MuscleGroup, ParentLift } from '@linex/shared/enums';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { ExerciseOption } from './types';

const KIND_LABEL: Record<ExerciseKind, string> = {
  main: '메인 (스쿼트/벤치/데드)',
  variation: '변형 (메인 변형)',
  accessory: '보조 (근육군)',
};

const PARENT_LIFT_LABEL: Record<Exclude<ParentLift, 'none'>, string> = {
  squat: '스쿼트 계열',
  bench: '벤치 계열',
  deadlift: '데드리프트 계열',
};

const MUSCLE_GROUP_LABEL: Record<Exclude<MuscleGroup, 'none'>, string> = {
  quad: '대퇴사두',
  posterior_chain: '후면 사슬 (햄/둔근)',
  back: '등',
  chest: '가슴',
  shoulder: '어깨',
  triceps: '삼두',
  biceps: '이두',
  core: '코어',
};

interface ExercisePickerProps {
  exercises: ExerciseOption[];
  excludeIds?: number[];
  onPick: (id: number) => void;
  onCancel: () => void;
}

export function ExercisePicker({
  exercises,
  excludeIds = [],
  onPick,
  onCancel,
}: ExercisePickerProps) {
  const [kind, setKind] = useState<ExerciseKind | ''>('');
  const [parentLift, setParentLift] = useState<ParentLift | ''>('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | ''>('');
  const [exerciseId, setExerciseId] = useState<string>('');

  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);

  const filtered = useMemo(() => {
    if (!kind) return [];
    if (kind === 'main') {
      return exercises.filter((e) => e.kind === 'main' && !exclude.has(e.id));
    }
    if (kind === 'variation') {
      if (!parentLift) return [];
      return exercises.filter(
        (e) => e.kind === 'variation' && e.parentLift === parentLift && !exclude.has(e.id),
      );
    }
    if (!muscleGroup) return [];
    return exercises.filter(
      (e) => e.kind === 'accessory' && e.muscleGroup === muscleGroup && !exclude.has(e.id),
    );
  }, [exercises, kind, parentLift, muscleGroup, exclude]);

  const handleAdd = () => {
    const id = Number(exerciseId);
    if (Number.isInteger(id) && id > 0) {
      onPick(id);
    }
  };

  return (
    <div className="rounded-md border bg-muted/40 p-3 space-y-2">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <div>
          <Select
            value={kind}
            onValueChange={(v) => {
              setKind(v as ExerciseKind);
              setParentLift('');
              setMuscleGroup('');
              setExerciseId('');
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(KIND_LABEL) as ExerciseKind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {kind === 'variation' && (
          <div>
            <Select
              value={parentLift}
              onValueChange={(v) => {
                setParentLift(v as ParentLift);
                setExerciseId('');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="부모 종목" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PARENT_LIFT_LABEL) as Array<Exclude<ParentLift, 'none'>>).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PARENT_LIFT_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {kind === 'accessory' && (
          <div>
            <Select
              value={muscleGroup}
              onValueChange={(v) => {
                setMuscleGroup(v as MuscleGroup);
                setExerciseId('');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="근육군" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MUSCLE_GROUP_LABEL) as Array<Exclude<MuscleGroup, 'none'>>).map(
                  (m) => (
                    <SelectItem key={m} value={m}>
                      {MUSCLE_GROUP_LABEL[m]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {kind &&
          (kind === 'main' ||
            (kind === 'variation' && parentLift) ||
            (kind === 'accessory' && muscleGroup)) && (
            <div className="md:col-span-1">
              <Select value={exerciseId} onValueChange={setExerciseId}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={filtered.length === 0 ? '선택 가능한 운동 없음' : '운동 선택'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {filtered.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleAdd} disabled={!exerciseId}>
          추가
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}
