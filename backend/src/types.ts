// Worker 환경 타입. wrangler.toml 의 binding과 .dev.vars/secrets 에 맞춰 둔다.

export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
};

export type AppBindings = {
  Bindings: Env;
};
