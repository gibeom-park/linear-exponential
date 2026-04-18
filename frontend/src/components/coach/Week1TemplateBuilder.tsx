import type { DayOfWeek } from '@linex/shared/enums';

import { DayColumn } from './DayColumn';
import type { DayDraft, ExerciseOption } from './types';

const DAY_LABEL_KO: Record<DayOfWeek, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

interface Week1TemplateBuilderProps {
  selectedDays: DayOfWeek[];
  week1: DayDraft[];
  exercises: ExerciseOption[];
  onChange: (next: DayDraft[]) => void;
}

export function Week1TemplateBuilder({
  selectedDays,
  week1,
  exercises,
  onChange,
}: Week1TemplateBuilderProps) {
  const updateDay = (idx: number, next: DayDraft) => {
    onChange(week1.map((d, i) => (i === idx ? next : d)));
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {week1.map((day, i) => {
        const dow = selectedDays[i];
        const label = `Day ${day.dayNo}${dow ? ` · ${DAY_LABEL_KO[dow]}` : ''}`;
        return (
          <DayColumn
            key={day.dayNo}
            day={day}
            label={label}
            exercises={exercises}
            onChange={(next) => updateDay(i, next)}
          />
        );
      })}
    </div>
  );
}
