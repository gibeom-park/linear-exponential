// Worker 환경 타입. wrangler.toml 의 binding + .dev.vars/Worker secrets 에 맞춰 둔다.

export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  // Phase 4: 회원가입 코드 (단일 공유 시크릿). prod 는 wrangler secret put, 로컬은 .dev.vars
  INVITE_CODE: string;
  // 로컬 dev 에서 Cf-Access 헤더가 없을 때 fallback email (선택)
  DEV_USER_EMAIL?: string;
  // 테스트 전용: DB lookup 우회용 단락. 절대 prod 에 두지 않는다.
  DEV_USER_ID?: number | string;
};

export type Variables = {
  // requireUser 미들웨어가 채움. 라우트에서 c.get('userId') 로 접근.
  userId: number;
  userEmail: string;
};

export type AppBindings = {
  Bindings: Env;
  Variables: Variables;
};
