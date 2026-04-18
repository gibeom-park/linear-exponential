# Linear Exponential

파워리프팅 프로그램 도구. Cloudflare Workers + D1 + React PWA + Gemini.

설계 문서는 [`plan/claude/`](./plan/claude/) (도메인 / 인프라 / 프롬프트 / 로드맵), 도메인 자료는 [`docs/`](./docs/).

## 사전 준비

1. Node 20+ 와 pnpm 10+ (corepack 추천)
   ```sh
   corepack enable && corepack prepare pnpm@latest --activate
   ```
2. Cloudflare 계정 + API Token. `.env.example` 의 권한 가이드 참조.
3. Gemini API Key (Phase 2 부터 필요).
4. 환경 변수 파일 복사 후 채우기:
   ```sh
   cp .env.example .env                     # CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
   cp backend/.dev.vars.example backend/.dev.vars   # GEMINI_API_KEY
   ```

## 개발 (로컬)

```sh
pnpm install
pnpm dev            # frontend (5173) + backend (wrangler dev, 8787) 동시 기동
```

- 프론트는 `/api/*` 요청을 백엔드 8787 로 proxy.
- D1 은 wrangler dev 시 로컬에 시뮬레이트 (`.wrangler/state/v3/d1`).

### 흔한 명령

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 프론트 + 백엔드 동시 실행 |
| `pnpm lint` / `pnpm lint:fix` | Biome 검사 / 자동 수정 |
| `pnpm typecheck` | 모든 패키지 tsc --noEmit |
| `pnpm test` | 모든 패키지 vitest run |
| `pnpm db:generate` | Drizzle 마이그레이션 SQL 생성 |
| `pnpm db:migrate:local` | 로컬 D1 에 마이그레이션 적용 |
| `pnpm db:migrate:remote` | 원격 D1 에 마이그레이션 적용 (.env 필요) |
| `pnpm db:seed:local` | 로컬 D1 에 시드 적재 |
| `pnpm db:seed:remote` | 원격 D1 에 시드 적재 (.env 필요) |
| `pnpm deploy` | 프론트 빌드 + Worker 배포 (.env 필요) |

`*:remote` 와 `deploy` 는 `dotenv-cli` 가 `.env` 를 자동 로드한다. 로컬 명령은 `.env` 없이도 동작.

## 시크릿 / 인증

| 위치 | 들어가는 값 | 누가 읽는가 |
|---|---|---|
| `.env` (gitignored) | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | wrangler CLI / GitHub Actions |
| `backend/.dev.vars` (gitignored) | `GEMINI_API_KEY` | `wrangler dev` 가 Worker 에 주입 |
| Cloudflare Workers Secrets | `GEMINI_API_KEY` (프로덕션) | 배포된 Worker 가 `c.env.GEMINI_API_KEY` 로 읽음 |

프로덕션 시크릿 등록:
```sh
set -a && source .env && set +a
pnpm --filter backend exec wrangler secret put GEMINI_API_KEY
```

## 배포 토폴로지

Worker 하나가 `/api/*` (Hono) + 그 외 경로 (정적 자산: `frontend/dist`) 를 모두 서빙하는 **Single Worker** 구조. Pages 는 사용하지 않음. 자세한 근거는 [`plan/claude/infra_model.md`](./plan/claude/infra_model.md) §7.

```
브라우저
  └─ linex.<subdomain>.workers.dev  (Cloudflare Access 보호)
        ├─ /api/*  →  Hono → D1 / Gemini
        └─ 그 외   →  ASSETS 바인딩 (SPA fallback: index.html)
```

## Cloudflare Access (Zero Trust) 설정 — 수동

배포된 Worker 도메인을 본인 이메일로만 접근하게 막는다. 무료 플랜 (50 시트) 안에서 운영. **Single Worker 구조라 Application 1개만 등록하면 끝.**

1. <https://one.dash.cloudflare.com> → Zero Trust → Access → Applications.
2. **Add an application** → **Self-hosted**.
3. Application Configuration:
   - **Application name**: `linex`
   - **Application domain**: 배포된 워커 도메인 (예: `linex.<subdomain>.workers.dev`)
   - **Session duration**: 24 hours 권장.
4. **Add a policy**:
   - **Policy name**: `owner-only`
   - **Action**: `Allow`
   - **Configure rules** → **Include** → `Emails` → 본인 이메일 추가.
5. (선택) Identity provider: 기본 One-time PIN 으로 충분. Google OAuth 를 붙이면 클릭 한 번에 통과.

### 함의

- Worker 는 인증 통과 후 `Cf-Access-Authenticated-User-Email` 헤더로 사용자를 식별 가능 (멀티 유저 전환 시 사용).
- 프론트 PWA 는 첫 진입 시 Access 의 OTP/IdP 플로우를 거친 뒤 쿠키 기반 세션으로 동작.
- 로컬 `wrangler dev` 는 Access 를 우회 (로컬 환경이므로).

## 디렉토리

```
linear-exponential/
├── frontend/   # Vite + React + TanStack Router/Query + Tailwind + PWA
├── backend/    # Cloudflare Worker + Hono + Drizzle + D1 + Gemini
├── shared/     # Drizzle 스키마 + Zod 검증 + 도메인 enum (frontend/backend 공통 import)
├── docs/       # 도메인 자료 (운동 시드, e1RM 공식, 주기화 모델)
└── plan/       # 설계 문서
    ├── total_plan.md          # 사용자 작성 (overview)
    └── claude/                # Claude 작성 (domain / infra / prompts / roadmap)
```

스택 결정 근거는 [`plan/claude/infra_model.md`](./plan/claude/infra_model.md), 단계별 진행 상황은 [`plan/claude/roadmap.md`](./plan/claude/roadmap.md).

## 배포

```sh
set -a && source .env && set +a
pnpm deploy   # = pnpm --filter frontend build && pnpm --filter backend deploy
```

루트 `deploy` 가 프론트 빌드 → Worker 업로드 (정적 자산 포함) 를 한 번에 처리. Pages 는 사용하지 않음 (§배포 토폴로지 참조).
