import { defineConfig } from 'drizzle-kit';

// 마이그레이션 SQL 만 생성. 실제 적용은 `wrangler d1 migrations apply` 가 담당.
// (D1 의 마이그레이션 메커니즘이 .sql 파일을 그대로 실행하는 구조이므로
//  drizzle-kit push 를 쓰지 않고 generate 만 사용.)

export default defineConfig({
  schema: '../shared/src/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
});
