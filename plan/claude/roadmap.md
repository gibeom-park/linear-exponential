# 로드맵 (Phase 별 Done definition)

`total_plan.md` §5 의 Phase 1~4 에 완료 기준을 추가하고 Phase 0 (사전 결정) 을 명시. 각 Phase 가 끝났는지 확인 가능한 체크리스트 + 검증 명령을 함께 둠.

마지막 갱신: 2026-04-18.

관련: [`domain_model.md`](./domain_model.md), [`infra_model.md`](./infra_model.md), [`prompts_model.md`](./prompts_model.md), [`total_plan_suggestions.md`](./total_plan_suggestions.md)

---

## Phase 0 — 사전 결정 (설계)

**상태: ✅ 완료**

### Done definition
- 도메인 결정: A1~A4 + 후속 6건 모두 해결 → `domain_model.md`
- 도메인 자료 작성: `docs/exercises_seed.md`, `docs/e1rm_formulas.md`, `docs/periodization_models.md`
- 인프라 결정: B1~B4 + 프론트/백/공통 스택 → `infra_model.md`
- LLM 프롬프트 구조: C2 결정 → `prompts_model.md`
- 결정 트래커 `total_plan_suggestions.md` 의 A / B / C2 / E1·E2 모두 DECIDED

---

## Phase 1 — 인프라 & DB 셋업

**상태: ⏳ 시작 전**

### Done definition (모두 ✓ 가 되면 종료)
- [ ] pnpm workspace 초기화: `frontend/`, `backend/`, `shared/` 3패키지 + 루트 설정
- [ ] `frontend/` Vite + React + TS init (TanStack Router/Query, Tailwind, shadcn/ui CLI 1회)
- [ ] `backend/` Wrangler init (Hono + TS), `wrangler.toml` 에 D1 binding 선언
- [ ] D1 데이터베이스 생성 (로컬 + 원격), `drizzle.config.ts` 작성
- [ ] `shared/schema.ts` Drizzle 스키마: `users`, `settings`, `exercises`, `program_blocks`, `program_sets`, `training_logs`, `user_conditions` (모두 `user_id` FK 포함, B1 절충형)
- [ ] `shared/validators/` Zod 스키마 (drizzle-zod 자동 생성 + 도메인 검증 추가)
- [ ] `shared/enums.ts` 도메인 enum (`program_type`, `e1rm_formula`, `unit_system`, `kind`, `parent_lift`, `muscle_group`)
- [ ] 마이그레이션 실행: `drizzle-kit generate` → `wrangler d1 migrations apply --local` / `--remote`
- [ ] 시드 적재: `users(id=1)`, `settings(default kg / epley / conventional)`, `exercises` (메인 3 + 변형 ~55 + 보조 ~45)
- [ ] Cloudflare Access 본인 이메일 등록, Workers/Pages 도메인 보호 적용
- [ ] Hono 앱 + `GET /api/health` (200 OK 반환)
- [ ] Biome 루트 설정 → 전 패키지 lint 통과
- [ ] GitHub Actions CI 워크플로우 (lint + test) 1회 green
- [ ] `pnpm dev` 한 줄로 frontend + backend 동시 실행

### Verification
```
# DB 시드 확인
wrangler d1 execute <db> --remote --command "SELECT count(*) FROM exercises"
# expect: ~100

# Worker 헬스체크 (Access 통과 후)
curl -H "Cf-Access-Jwt-Assertion: ..." https://<worker>/api/health
# expect: 200 OK

# 로컬 동시 실행
pnpm dev
# expect: frontend localhost:5173, backend localhost:8787 동시 기동
```

---

## Phase 2 — 코치 모드 MVP

**상태: ⏳ Phase 1 완료 후**

### Done definition
- [ ] `backend/prompts/coach_{linear,dup,block,conjugate}.md` 4개 작성 (frontmatter + System/User 섹션)
- [ ] `backend/prompts/lib/render.ts` 구현 + 단위 테스트 (`{{var}}` 치환 + 누락 검증)
- [ ] `shared/validators/llm/coach_output.ts` Zod 스키마 (block/week/day/exercise/set 계층)
- [ ] `backend/src/lib/gemini.ts` 클라이언트 래퍼 (env `GEMINI_MODEL` 우선, frontmatter default)
- [ ] `POST /api/coach/generate-block`: 입력 검증 → 프롬프트 렌더 → Gemini 호출 → Zod 검증 (1회 재시도) → DB 적재
- [ ] `program_blocks` row 에 `prompt_version` (frontmatter) + `prompt_hash` (sha256) 기록
- [ ] `GET /api/coach/blocks/:id` 조회 동작
- [ ] 프론트 코치 모드 화면: 4개 프로그램 카드 + 블럭 길이/주당 일수/1RM/데드 스탠스 입력 폼 → 결과 미리보기 (week × day 표)

### Verification
- 프론트에서 linear 프로그램 1개 생성 → DB 의 `program_blocks` 1행 + `program_sets` (weeks × days_per_week × N) 행 적재 → 미리보기에서 계층 확인
- DUP / Block / Conjugate 도 같은 흐름으로 1회씩 생성 성공

---

## Phase 3 — 훈련 모드 MVP

**상태: ⏳ Phase 2 완료 후**

### Done definition
- [ ] 사전 체크인 화면: 수면(0.5h 단위 슬라이더) / 컨디션(1~5) / 체중 → `POST /api/train/checkin`
- [ ] 오늘 시트 자동 표시: 활성 블럭의 오늘 day 매핑 → 운동 + 세트 카드 노출
- [ ] 세트별 입력: RPE 필수, 무게는 ±10% 가드 (가드 외 시도 시 "코치에게 다시 물어보기" 버튼 노출 — Phase 4 에서 연결)
- [ ] 세션 완료 → `POST /api/train/session-log` (training_logs 일괄 적재, weight_planned + weight_actual 둘 다)
- [ ] IndexedDB 오프라인 큐 (`idb` 라이브러리): 오프라인 시 outbox 에 저장
- [ ] 온라인 복귀 시 자동 flush + LWW 적용
- [ ] Service Worker (`vite-plugin-pwa`): 앱 셸 cache-first / API network-first / 운동·블럭 메타 SWR
- [ ] PWA manifest + 모바일 viewport 최적화 (헬스장 환경)

### Verification
- Playwright 모바일 viewport: 체크인 → 세션 시작 → 오프라인 전환 → 세트 3개 기록 → 온라인 복귀 → D1 에 반영 확인
- iOS Safari / Android Chrome 에서 PWA 설치 후 오프라인 동작 시연

---

## Phase 4 — AI 고도화

**상태: ⏳ Phase 3 완료 후**

### Done definition
- [ ] `backend/prompts/coach_realtime_adjust.md` 프롬프트 작성
- [ ] `POST /api/train/realtime-adjust`: 현재 세션 컨텍스트 + 변경 사유 → 새 계획 무게 + 한 줄 코멘트
- [ ] 훈련 화면 ±10% 초과 시도 → "코치에게 다시 물어보기" 버튼 → 위 API 호출 → 계획 무게 갱신
- [ ] D 섹션 결정 (D1 표현 정정, D2 분석 방법, D3 인사이트 트리거)
- [ ] `backend/prompts/analysis_insights.md` 프롬프트
- [ ] `GET /api/analysis/insights?block_id=...`: training_logs + user_conditions 교차 분석 → 인사이트 카드 N종
- [ ] 분석 화면: e1RM 시계열 (Recharts) + 인사이트 카드 최소 3종 자동 표시
- [ ] 블럭 종료 시점에 분석 갱신 trigger (수동 버튼 + 자동 둘 다 가능)

### Verification
- 한 블럭 완료 → 분석 화면 진입 → e1RM 추세 + 인사이트 카드 3종 표시
- 훈련 중 무게 ±15% 변경 시도 → 챗봇 호출 → 새 계획 무게 반영 1회 시연

---

## Post-MVP (Phase 5+, 현재 미정)

다음 결정 트리거가 있을 때 진행:
- 멀티 유저 전환 (B1 → 인증/회원가입 흐름)
- 추가 주기화 모델 (5/3/1, GZCL 등)
- 분석 인사이트 푸시/이메일 알림
- D1 → R2 백업 자동화 (B Open Questions)
- LLM 호출 비용 모니터링 (C5)
- 음성 입력 / 자동 동기화 등 UX 개선

---

## 진행 시 갱신 규칙
- Phase 진입 시 상태 ⏳ → 🚧 변경
- Phase 완료 시 🚧 → ✅ + 완료일 기재
- Done definition 항목은 작업 중 추가/조정 가능 (변경은 git log 로 추적)
- 새 Phase (5+) 추가 시 이 문서에 섹션 추가
