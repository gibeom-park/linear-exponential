import { Trash2 } from 'lucide-react';

import type { LlmCoachOutput } from '@linex/shared/validators/llm/coach_output';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export interface ExerciseOption {
  id: number;
  name: string;
}

interface Props {
  plan: LlmCoachOutput;
  exercises: ExerciseOption[];
  onChange: (next: LlmCoachOutput) => void;
}

// 깊게 immutable update — Phase 2 MVP 라 immer 미사용.
// LlmCoachOutput 가 작으니 매번 깊은 복제해도 괜찮음.
export function PlanEditor({ plan, exercises, onChange }: Props) {
  const update = (mutator: (draft: LlmCoachOutput) => void) => {
    const draft = structuredClone(plan);
    mutator(draft);
    onChange(draft);
  };

  return (
    <div className="space-y-6">
      {plan.weeks.map((week, wi) => (
        <section key={`w${week.week_no}`} className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Week {week.week_no}</h2>
            {week.notes && <span className="text-sm text-slate-500">{week.notes}</span>}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {week.days.map((day, di) => (
              <Card key={`w${week.week_no}d${day.day_no}`}>
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    Day {day.day_no}
                    {day.focus && (
                      <span className="ml-2 text-xs font-normal text-slate-500">{day.focus}</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {day.exercises.map((ex, ei) => (
                    <div
                      key={`w${week.week_no}d${day.day_no}e${ei}`}
                      className="space-y-2 rounded-md border border-slate-200 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <select
                          className="h-8 flex-1 rounded-md border border-slate-200 px-2 text-sm"
                          value={ex.name}
                          onChange={(e) =>
                            update((d) => {
                              const target = d.weeks[wi]?.days[di]?.exercises[ei];
                              if (target) target.name = e.target.value;
                            })
                          }
                        >
                          <option value={ex.name}>{ex.name}</option>
                          {exercises
                            .filter((opt) => opt.name !== ex.name)
                            .map((opt) => (
                              <option key={opt.id} value={opt.name}>
                                {opt.name}
                              </option>
                            ))}
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            update((d) => {
                              d.weeks[wi]?.days[di]?.exercises.splice(ei, 1);
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] items-center gap-2 text-xs text-slate-500">
                        <span>#</span>
                        <span>reps</span>
                        <span>kg</span>
                        <span>RPE</span>
                        <span />
                      </div>

                      {ex.sets.map((set, si) => (
                        <div
                          key={`w${week.week_no}d${day.day_no}e${ei}s${si}`}
                          className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] items-center gap-2"
                        >
                          <span className="text-sm text-slate-500">{set.set_no}</span>
                          <Input
                            type="number"
                            min={1}
                            value={set.reps}
                            onChange={(e) =>
                              update((d) => {
                                const t = d.weeks[wi]?.days[di]?.exercises[ei]?.sets[si];
                                if (t) t.reps = Number(e.target.value);
                              })
                            }
                          />
                          <Input
                            type="number"
                            step={2.5}
                            min={0}
                            value={set.weight_kg}
                            onChange={(e) =>
                              update((d) => {
                                const t = d.weeks[wi]?.days[di]?.exercises[ei]?.sets[si];
                                if (t) t.weight_kg = Number(e.target.value);
                              })
                            }
                          />
                          <Input
                            type="number"
                            step={0.5}
                            min={1}
                            max={10}
                            value={set.rpe ?? ''}
                            onChange={(e) =>
                              update((d) => {
                                const t = d.weeks[wi]?.days[di]?.exercises[ei]?.sets[si];
                                if (!t) return;
                                t.rpe = e.target.value === '' ? undefined : Number(e.target.value);
                              })
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              update((d) => {
                                const sets = d.weeks[wi]?.days[di]?.exercises[ei]?.sets;
                                if (!sets) return;
                                sets.splice(si, 1);
                                sets.forEach((s, idx) => {
                                  s.set_no = idx + 1;
                                });
                              })
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          update((d) => {
                            const sets = d.weeks[wi]?.days[di]?.exercises[ei]?.sets;
                            if (!sets) return;
                            const last = sets[sets.length - 1];
                            sets.push({
                              set_no: sets.length + 1,
                              reps: last?.reps ?? 5,
                              weight_kg: last?.weight_kg ?? 0,
                              rpe: last?.rpe,
                            });
                          })
                        }
                      >
                        + 세트 추가
                      </Button>
                    </div>
                  ))}

                  <AddExerciseRow
                    options={exercises}
                    onAdd={(name) =>
                      update((d) => {
                        d.weeks[wi]?.days[di]?.exercises.push({
                          name,
                          sets: [{ set_no: 1, reps: 5, weight_kg: 0, rpe: 7 }],
                        });
                      })
                    }
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function AddExerciseRow({
  options,
  onAdd,
}: {
  options: ExerciseOption[];
  onAdd: (name: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        className="h-9 flex-1 rounded-md border border-slate-200 px-2 text-sm"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) {
            onAdd(e.target.value);
            e.target.value = '';
          }
        }}
      >
        <option value="" disabled>
          + 운동 추가…
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.name}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}
