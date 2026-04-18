// 휴식일 / 블럭 외 날짜 안내 카드. hint.prev/next 로 인접 훈련일 점프.

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface RestDayHintProps {
  date: string;
  hint: { prev: string | null; next: string | null };
  onJump: (next: string) => void;
}

export function RestDayHint({ date, hint, onJump }: RestDayHintProps) {
  const both = !hint.prev && !hint.next;
  return (
    <Card>
      <CardContent className="space-y-3 py-6">
        <p className="text-sm">
          <span className="font-medium">{date}</span> 은 휴식일이거나 활성 블럭 범위 밖입니다.
        </p>
        {both ? (
          <p className="text-sm text-muted-foreground">활성 블럭에 인접한 훈련일이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {hint.prev && (
              <Button variant="outline" size="sm" onClick={() => onJump(hint.prev as string)}>
                ← 이전 훈련일 ({hint.prev})
              </Button>
            )}
            {hint.next && (
              <Button variant="outline" size="sm" onClick={() => onJump(hint.next as string)}>
                다음 훈련일 ({hint.next}) →
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
