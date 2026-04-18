// 가입 페이지. Cf-Access 인증된 사용자가 초대 코드로 가입 완료한다.
// 백엔드는 (email, code) 가 모두 맞아야 user 행을 만든다.

import { createRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { Route as RootRoute } from './__root.tsx';

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; email: string };

function RegisterPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setStatus({ kind: 'submitting' });
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const body: { id?: number; email?: string; error?: string; message?: string } = await res
        .json()
        .catch(() => ({}) as never);

      if (res.status === 201 && body.email) {
        setStatus({ kind: 'ok', email: body.email });
        // 1.5초 후 홈으로 (Cf-Access cookie + 새 user 행 → /api/auth/me 통과)
        setTimeout(() => navigate({ to: '/' }), 1500);
        return;
      }

      if (res.status === 401) {
        setStatus({
          kind: 'error',
          message: 'Cloudflare 로그인 세션이 없습니다. 처음부터 다시 시도하세요.',
        });
        return;
      }
      if (res.status === 403) {
        setStatus({ kind: 'error', message: '초대 코드가 올바르지 않습니다.' });
        return;
      }
      if (res.status === 409) {
        setStatus({ kind: 'error', message: '이미 가입된 계정입니다. 새로고침 후 진입하세요.' });
        return;
      }
      setStatus({
        kind: 'error',
        message: body.message ?? body.error ?? `등록 실패 (${res.status})`,
      });
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message });
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">가입</h1>
      <p className="mt-2 text-sm text-slate-600">
        Cloudflare Access 로 본인 인증된 이메일에 초대 코드를 더해 가입을 완료합니다.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="code">초대 코드</Label>
          <Input
            id="code"
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={status.kind === 'submitting' || status.kind === 'ok'}
            autoComplete="off"
            autoFocus
          />
        </div>

        <Button
          type="submit"
          disabled={status.kind === 'submitting' || status.kind === 'ok' || !code.trim()}
        >
          {status.kind === 'submitting' ? '확인 중…' : '가입하기'}
        </Button>

        {status.kind === 'error' && <p className="text-sm text-red-600">{status.message}</p>}
        {status.kind === 'ok' && (
          <p className="text-sm text-emerald-700">가입 완료: {status.email}. 홈으로 이동합니다…</p>
        )}
      </form>
    </main>
  );
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/register',
  component: RegisterPage,
});
