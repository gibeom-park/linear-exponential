// 401 registration_required 응답을 받으면 /register 로 단방향 리다이렉트.
// 모든 /api/* 호출이 통과하도록 window.fetch 를 한 번만 감싼다.
// 가입 완료 후에는 같은 endpoint 가 정상 응답을 줄 것이므로 추가 처리 없음.

const REGISTER_PATH = '/register';

let installed = false;

export function installApiFetchInterceptor() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const original = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const res = await original(input, init);
    if (res.status !== 401) return res;

    // /api/* 외 호출 (외부 도메인 / 정적 자원) 은 건드리지 않는다.
    const url =
      typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
    if (!url.includes('/api/')) return res;

    // /register 호출 자체에서 401 이 떨어진 거면 (가입 안 된 사용자가 코드 시도 등) 리다이렉트하지 않는다.
    if (url.includes('/api/auth/register')) return res;

    // 이미 register 페이지면 무한 리다이렉트 방지.
    if (window.location.pathname === REGISTER_PATH) return res;

    // body 를 한 번만 읽기 위해 clone.
    let body: { error?: string } | null = null;
    try {
      body = await res.clone().json();
    } catch {
      // JSON 아니면 그냥 통과.
    }
    if (body?.error === 'registration_required') {
      window.location.href = REGISTER_PATH;
    }
    return res;
  };
}
