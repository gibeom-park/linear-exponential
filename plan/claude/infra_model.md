# 인프라 모델 (결정된 사항)

`total_plan.md` 의 인프라/데이터 결정사항을 모은 문서. 도메인 결정은 [`domain_model.md`](./domain_model.md), 보강 트래커는 [`total_plan_suggestions.md`](./total_plan_suggestions.md).

마지막 갱신: 2026-04-18 — B 섹션 1차 결정 + 프론트/백/공통 도구 스택 결정 + 배포 토폴로지를 Single Worker (Static Assets) 로 정정. **추가**: Phase 2 가 수동 빌더로 재구성되며 Gemini 키 관리 / `@google/generative-ai` 의존 / `gemini.ts` 항목은 Post-MVP 로 이동. **Phase 4 (멀티유저 전환)**: §1 의 "단일 유저 가정" 폐기 → Cf-Access 이메일 + 초대 코드 (`INVITE_CODE` Worker secret) 게이트로 가입 → `users` 행 생성 → 모든 라우트가 `requireUser` 미들웨어를 통해 `c.get('userId')` 사용. 자세한 결정은 [`roadmap.md`](./roadmap.md) Phase 4 섹션 참고.

---

## 1. 사용자 모델 (B1)

### 결정
- **단일 유저로 시작 + user_id FK 절충형**
- 처음부터 `users` 테이블 + 모든 도메인 테이블에 `user_id` FK 박아두되, 인증/UI 는 단일 유저 가정으로 단순하게 운영
- 멀티 유저 전환 시 데이터 마이그레이션 0

### 데이터 함의
- `users(id, created_at, ...)` 테이블 신규
- 모든 도메인 테이블 (`program_blocks`, `program_sets`, `training_logs`, `user_conditions`, `settings`) 에 `user_id INTEGER NOT NULL REFERENCES users(id)`
- 시드: `INSERT INTO users (id) VALUES (1)` — 본인용 단일 행
- 코드 레벨 default: `user_id = 1` 을 상수로 두고 모든 쿼리에 자동 주입 (멀티 유저 전환 시 인증 컨텍스트에서 추출하도록 교체)

---

## 2. 인증 (B2)

### 결정
- **Cloudflare Access (Zero Trust)**
- 무료 플랜 한도 (50명 시트) 내 사용
- 본인 Cloudflare 계정 + 등록된 이메일로만 접근 가능

### 함의
- Workers 코드에 인증 로직 거의 불필요 (Access 가 앞단에서 차단)
- 필요 시 `Cf-Access-Authenticated-User-Email` 헤더로 사용자 식별
- 프론트엔드는 Access 의 OAuth-like 플로우를 거친 후 진입 (브라우저가 자동 처리)
- 모바일 PWA 와도 호환 (쿠키 기반 세션)

### LLM API 키 관리 — DEFERRED
- Phase 2 수동 코치 모드는 외부 LLM 호출이 없음 → `GEMINI_*` 시크릿 / `.dev.vars` 항목 제거 완료
- 배포된 Worker 의 `GEMINI_API_KEY` 는 사용자 수동 정리: `wrangler secret delete GEMINI_API_KEY`
- AI 재도입 시점에 키 관리 / 프록시 / 클라이언트 래퍼 위치를 다시 결정 (1차안은 [`archive/prompts_model.md`](./archive/prompts_model.md))

---

## 3. ORM / 마이그레이션 / 모노레포 (B3)

### 결정
- **ORM**: Drizzle ORM + Drizzle Kit (Cloudflare D1 first-class 지원)
- **모노레포**: pnpm workspace
- **공통 패키지**: `shared/` — Drizzle 스키마 + 추론 타입 + Zod 검증 + 도메인 enum

### 모노레포 구조
```
linear-exponential/
  package.json              # workspace root
  pnpm-workspace.yaml
  frontend/
    package.json
    src/
  backend/
    package.json
    src/
    wrangler.toml
    drizzle.config.ts
    drizzle/                # 마이그레이션 파일
  shared/
    package.json
    src/
      schema.ts             # Drizzle 테이블 정의 (frontend/backend 양쪽 import)
      types.ts              # 스키마에서 추론된 TS 타입
      validators.ts         # Zod 스키마 (drizzle-zod 로 자동 생성 가능)
      enums.ts              # day_of_week, e1rm_formula 등 도메인 enum
```

### Drizzle 워크플로우
- 스키마 수정 → `drizzle-kit generate` → 마이그레이션 SQL 생성
- 로컬 적용: `wrangler d1 migrations apply <db> --local`
- 프로덕션 적용: `wrangler d1 migrations apply <db> --remote`

---

## 4. 오프라인 / 동기화 (B4)

### 결정
- **클라이언트 저장**: IndexedDB (`idb` 라이브러리)
- **동기화 정책**: Last-Write-Wins (LWW) — 단일 유저 + 단일 디바이스 가정과 잘 맞음
- **Service Worker 캐싱**:
  - 앱 셸 (HTML/JS/CSS): cache-first
  - API 응답: network-first + 오프라인 fallback
  - 운동 카탈로그·프로그램 메타: stale-while-revalidate
- **PWA 도구**: `vite-plugin-pwa` (Workbox wrapper)

### 동작 흐름
1. 헬스장 진입 (오프라인 가능) → IndexedDB 에 오늘 세션 + 운동 카탈로그 미리 캐시 (지난 온라인 시점)
2. 세트 기록 → IndexedDB 의 outbox 큐에 저장
3. 온라인 복귀 시 outbox flush → `/api/train/sync` 로 일괄 전송
4. LWW: 서버 row 의 `updated_at` 비교, 더 최근 값으로 덮어씀 (단일 유저면 사실상 충돌 없음)

### 단위 default
- **kg** (B-add-1) — 신규 사용자 첫 진입 시 default
- 사용자 설정에서 lb 로 토글 가능 (domain_model.md §5)

---

## 5. 프론트엔드 스택

| 항목 | 선택 | 비고 |
|---|---|---|
| 빌드 툴 | **Vite** | React + TS, HMR 빠름, `vite-plugin-pwa` 와 자연스러움 |
| UI 프레임워크 | **React** | 최신 stable (`total_plan.md` 명시) |
| 라우팅 | **TanStack Router** | 타입 세이프, code-based route 정의 |
| 데이터 페칭 | **TanStack Query** | 오프라인 + 캐싱 + IndexedDB 연동 자연스러움 |
| 전역 상태 | **Zustand** | TanStack Query 외 minimal 한 전역 (단위 토글, 사용자 설정 등) |
| 스타일링 | **Tailwind CSS** | 모바일 PWA 에 빠름 |
| UI 컴포넌트 | **shadcn/ui** | Radix primitives + Tailwind, 복붙 형태로 dependency 없이 가져옴 |
| 폼 + 검증 | **React Hook Form + Zod** | `shared/validators.ts` 의 Zod 스키마 그대로 재사용 |
| 차트 (분석 모드) | **Recharts** | 분석 모드 진입 시 lazy load |

### 함의
- `frontend/package.json` dependencies: `react`, `react-dom`, `@tanstack/react-router`, `@tanstack/react-query`, `zustand`, `tailwindcss`, `react-hook-form`, `@hookform/resolvers`, `zod`, `recharts`, `idb`, `vite-plugin-pwa`
- shadcn/ui 컴포넌트는 `frontend/src/components/ui/` 에 복붙 (CLI: `pnpm dlx shadcn@latest add <component>`)
- Tailwind 설정은 `frontend/tailwind.config.ts` + 루트 `frontend/src/styles/globals.css`

---

## 6. 백엔드 스택

| 항목 | 선택 | 비고 |
|---|---|---|
| HTTP 라우팅 | **Hono** | Workers 표준, 타입 세이프, 미들웨어 풍부 |
| 검증 (입출력) | **Zod** | `@hono/zod-validator` 미들웨어로 자동 검증 |
| LLM JSON 검증 | (DEFERRED) | AI 도입 시점에 다시 결정 |

### 함의
- `backend/package.json` dependencies: `hono`, `@hono/zod-validator`, `zod`, `drizzle-orm` — `@google/generative-ai` 는 제거됨 (AI 미사용)
- 라우터 구조: `backend/src/routes/{coach,train,analysis,sync}.ts`, 진입점 `backend/src/index.ts` 에서 Hono 앱 조립
- Drizzle D1 인스턴스는 `backend/src/lib/db.ts` 에서 생성, 각 핸들러는 `c.env.DB` 로 접근

---

## 7. 배포 토폴로지 — Single Worker + Static Assets

원래 안은 Pages + 별도 Worker 였으나, 단일 유저 PWA + Cloudflare Access 보호 요구를 감안해 **Worker 하나가 API 와 정적 자산을 모두 서빙** 하는 구조로 변경.

### 구조
```
[브라우저]
   │
   ▼
linex.<subdomain>.workers.dev  ← Cloudflare Access 정책 1개로 보호
   │
   ├── /api/*  →  Hono Worker  →  D1
   └── 그 외   →  ASSETS 바인딩  →  frontend/dist (SPA fallback: index.html)
```

### `wrangler.toml` 핵심
```toml
[assets]
directory = "../frontend/dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
run_worker_first = ["/api/*"]
```

### 배포 흐름
1. `pnpm --filter frontend build` → `frontend/dist` 채움
2. `pnpm --filter backend deploy` → Worker 코드 + 정적 자산 동시 업로드
3. 루트 `pnpm deploy` 가 위 두 단계를 직렬로 수행

### 함의
- **단일 도메인** → CORS 불필요, 프론트 fetch 는 `/api/*` 상대 경로 그대로
- **Cloudflare Access 정책 1개** 로 전체 앱 보호 (Pages 별도 등록 불필요)
- **Pages 는 사용 안 함** — git 연동 preview 가 사라지므로 배포 전 검증은 로컬 `wrangler dev` 또는 별도 preview Worker 로 대체
- 로컬 dev 는 여전히 두 갈래: Vite (5173, HMR) + `wrangler dev` (8787, /api). Vite 가 /api/* 를 8787 로 proxy. 정적 자산 바인딩은 dev 시에는 무시되지만 빌드된 `frontend/dist` 가 있으면 wrangler dev 로도 통합 미리보기 가능.

---

## 8. 공통 도구

| 항목 | 선택 | 비고 |
|---|---|---|
| 린터 + 포매터 | **Biome** | ESLint+Prettier 대체. 단일 설정 (`biome.json`), 빠름 |
| 백엔드 테스트 | **Vitest + Miniflare** | Workers 런타임 + D1 local 시뮬레이션 |
| 프론트 단위 테스트 | **Vitest + Testing Library** | 컴포넌트 / 훅 |
| E2E 테스트 | **Playwright** | 모바일 viewport + 오프라인 모드 시뮬레이션 |
| CI/CD | **GitHub Actions** | lint → test → (수동/자동) wrangler deploy |
| 패키지 매니저 | **pnpm** | workspace 내장, npm/yarn 대비 빠름 |

### 함의
- 루트 `biome.json` (전 패키지 공유)
- GitHub Actions workflow:
  - `ci.yml`: 모든 PR/push 에서 lint + typecheck + test
  - 배포 워크플로우는 추후 추가 (수동 trigger or main merge 시 단일 `pnpm deploy`)
- 시크릿: GitHub Actions 에 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` 등록

---

## Open Questions

- **Cloudflare Access 무료 플랜 한도**: 멀티 유저로 확장 시 50명 한도 안에 들어올지 (현재는 무관)
- **D1 백업 전략**: Open Question 으로 보관. R2 로 export 자동화는 운영 단계에서 결정
- **AI 엔진 / 비용 모니터링**: Post-MVP 항목. KR PoP geo-restriction 우회 인프라 (AI Gateway / Vertex AI / 다른 region 의 Worker / Edge proxy) 와 함께 결정.
