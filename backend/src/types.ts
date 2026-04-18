// Worker 환경 타입. wrangler.toml 의 binding 에 맞춰 둔다.

export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
};

export type AppBindings = {
  Bindings: Env;
};
