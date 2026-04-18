# 로드맵 (Phase 별 Done definition)

`total_plan.md` §5 의 Phase 1~4 에 완료 기준을 추가하고 Phase 0 (사전 결정) 을 명시. 각 Phase 가 끝났는지 확인 가능한 체크리스트 + 검증 명령을 함께 둠.

마지막 갱신: 2026-04-18 — **MVP 완료** (Phase 0~3 모두 ✅). Phase 2 는 수동 코치 모드로 재구성됨. AI 통합(Gemini) 은 Post-MVP 로 이동. 이전 LLM 기반 설계는 [`archive/prompts_model.md`](./archive/prompts_model.md) 에 보존.

관련: [`domain_model.md`](./domain_model.md), [`infra_model.md`](./infra_model.md), [`total_plan_suggestions.md`](./total_plan_suggestions.md)

---

## Phase 0 — 사전 결정 (설계)

**상태: ✅ 완료**

### Done definition
- 도메인 결정: A1~A4 + 후속 6건 모두 해결 → `domain_model.md`
- 도메인 자료 작성: `docs/exercises_seed.md`, `docs/e1rm_formulas.md`, `docs/periodization_models.md`
- 인프라 결정: B1~B4 + 프론트/백/공통 스택 → `infra_model.md`
- 결정 트래커 `total_plan_suggestions.md` 의 A / B / E1·E2 DECIDED. C / D 섹션은 AI 도입 시점까지 DEFERRED

---

## Phase 1 — 인프라 & DB 셋업

**상태: ✅ 완료 (2026-04-18)**

### Done definition (모두 ✓ 가 되면 종료)
- [x] pnpm workspace 초기화: `frontend/`, `backend/`, `shared/` 3패키지 + 루트 설정
- [x] `frontend/` Vite + React + TS init (TanStack Router/Query, Tailwind, shadcn/ui `components.json` 작성)
- [x] `backend/` Wrangler init (Hono + TS), `wrangler.toml` 에 D1 binding 선언
- [x] D1 데이터베이스 생성 (로컬 + 원격: `linex-db`, id `8a9438c0-…`), `drizzle.config.ts` 작성
- [x] `shared/schema.ts` Drizzle 스키마: 7테이블 (users / settings / exercises / program_blocks / program_sets / training_logs / user_conditions) 모두 `user_id` FK
- [x] `shared/validators/` Zod 스키마 (drizzle-zod + 도메인 검증)
- [x] `shared/enums.ts` 도메인 enum 7종
- [x] 마이그레이션 실행: `0000_init.sql` 로컬 + 원격 적용
- [x] 시드 적재: `users(id=1)`, `settings(kg/epley/conventional)`, `exercises` 107행 (메인 3 + 변형 58 + 보조 46)
- [x] Cloudflare Access 본인 이메일 등록 — Application `linex` + Policy `owner-only` (Include Emails=kibumchy@gmail.com) 확인
- [x] Hono 앱 + `GET /api/health` (200 OK + 단위 테스트 통과)
- [x] Biome 루트 설정 → 전 패키지 lint 통과
- [x] GitHub Actions CI 워크플로우 (`.github/workflows/ci.yml`): lint → typecheck → test → frontend build, PR / main push 트리거
- [x] `pnpm dev` 한 줄로 frontend + backend 동시 실행 (스모크 테스트 통과)

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

## Phase 2 — 코치 모드 MVP (수동 빌더)

**상태: ✅ 완료 (2026-04-18) — 수동 빌더로 재구성, 로컬 E2E 시연 완료**

> 1차안은 Gemini 기반 블럭 생성이었으나 (a) Workers KR PoP 의 Gemini geo-restriction, (b) 어차피 LLM 결과를 수정하는 사용 패턴, (c) "코치가 직접 짠다" 는 본래 의도와의 정합성을 이유로 **수동 빌더** 로 전환. AI 통합은 Post-MVP 로 이동.

### Done definition
- [x] `program_blocks` 스키마 재정의: `selected_days` (JSON), `start_date` / `end_date` (ISO), `notes`. `program_type` / `prompt_version` / `prompt_hash` / `raw_plan` 제거
- [x] `dayOfWeek` enum 추가 (`mon`/.../`sun`), `programType` enum 제거
- [x] 마이그레이션 `0001_manual_coach.sql` 적용 (DROP + CREATE)
- [x] `shared/validators/api/coach.ts` 재작성 (수동 입력 + cross-field 검증: selectedDays.length === daysPerWeek, dayNo 범위·중복)
- [x] `POST /api/coach/blocks`: 수동 입력 검증 → 활성 블럭 deactivate → block 1행 + 주 1 템플릿을 weeks 만큼 복제 → `program_sets` 일괄 insert (D1 100-var 청크 = 12 row)
- [x] `PATCH /api/coach/blocks/:id/week/:weekNo`: 해당 주 sets 통째 교체 (delete + insert)
- [x] `GET /api/coach/blocks/:id`: 블럭 + sets 조회
- [x] 프론트 `/coach`: 2-step (블럭 파라미터 → 주 1 템플릿 빌드 → 저장)
  - Step 1: weeks / 요일 체크박스 / shadcn Calendar Popover (startDate, endDate 자동 표시) / 1RM / 데드 스탠스 / 메모
  - Step 2: 선택한 요일 수만큼 day 카드 그리드. 카테고리 단계 드롭다운 (kind → parent_lift / muscle_group → exercise). 세트 행 (reps / kg / RPE).
- [x] 프론트 `/coach/blocks/:id`: 주별 편집 화면 (주 선택 탭 + Step 2 동일 UI + 주 단위 PATCH)
- [x] LLM 관련 코드 제거: `backend/src/lib/gemini.ts`, `backend/prompts/`, `backend/scripts/build-prompts.mjs`, `shared/src/validators/llm/`, `GEMINI_*` env / scripts
- [x] `prompts_model.md` → `archive/prompts_model.md` 로 이동 (AI 재도입 시 참고)
- [x] 로컬 E2E 시연 (시작일 → 자동 종료일, 6주 복제 적재, 주 3 무게만 수정 후 유지 확인)

### Verification
- 단위: `pnpm --filter backend test` (입력 검증 / 활성 토글 / sets 청크 / patch week / 404·400)
- 로컬: `pnpm dev` → `/coach` 진입 → 6주/주3회/Mon-Wed-Fri/오늘 startDate → 저장 → `/coach/blocks/:id` 자동 이동 → 6주 모두 동일 sets 표시 → 주 3 만 수정 → 새로고침 후 유지 확인
- DB:
  ```
  wrangler d1 execute linex-db --local \
    --command "SELECT week_no, day_no, set_no, planned_weight_kg \
               FROM program_sets WHERE block_id=1 \
               ORDER BY week_no, day_no, set_no"
  ```

---

## Phase 3 — 훈련 모드 MVP

**상태: ✅ 완료 (2026-04-18)**

> Phase 2 의 결정 (calendar nav / 체크인 선택 / ±10% 경고만 / 같은 날 재진입 허용) 을 그대로 반영. 백엔드 PR A (#5) → 프론트엔드 PR B (#6) → 오프라인 + PWA PR C 순으로 분리.

### Done definition
- [x] 백엔드: `GET /api/train/day?date=...` (활성 블럭 + plan + logs + 휴식일 hint), `GET/POST /api/train/checkin` (user×date upsert), `POST /api/train/sets` ((program_set_id, date) upsert + D1 100-var 청크)
- [x] 프론트: `/train` 페이지 — shadcn Calendar nav (휴식일이면 hint.prev/next 점프), CheckinForm (선택, 카드형), SessionSheet (운동별 그룹 + reps/무게/RPE 입력 + ±10% amber 경고)
- [x] 같은 날 재진입: logs 가 prefill → 다시 저장 시 update (`bodyweight 다음 날 운동` 케이스 대응)
- [x] IndexedDB outbox (`idb`): 오프라인 / 네트워크 실패 시 enqueue, LWW (같은 dedupeKey 는 최신만)
- [x] 온라인 복귀 시 자동 flush — `online` 이벤트 + 페이지 진입 시 1회 시도 + react-query 캐시 무효화로 즉시 반영
- [x] Service Worker (`vite-plugin-pwa`): 앱 셸 precache, API NetworkFirst (5s timeout), 카탈로그 SWR
- [x] PWA manifest + viewport: SVG 아이콘 (any+maskable), apple-touch-icon, viewport-fit=cover, portrait 강제, status-bar-style black-translucent
- [x] 로컬 E2E 시연 (Playwright): `pnpm dev` → `/train` → fetch override 로 POST sets 차단 → 세션 저장 → outbox 1건 적재 + "대기 1건" 배지 → fetch 복구 + "지금 보내기" → flush → outbox 0 + D1 갱신 확인 (2026-04-18)
- [x] iOS Safari / Android Chrome 실기기 PWA 설치 후 오프라인 동작 시연 (사용자 확인, 2026-04-18)

### Verification
- 단위: `pnpm --filter @linex/frontend test` (outbox 8케이스: enqueue / LWW / flush 200/4xx/5xx/network-error / 부분 성공)
- 수동 (Playwright 자동화 가능):
  ```
  pnpm dev → /train 진입 → 체크인 입력 → DevTools Offline → 세트 입력 → "대기 1건" 표시
  → DevTools Online → "지금 보내기" 클릭 또는 자동 flush → "대기 0건"
  → 새로고침 후 logs 유지 확인
  ```

---

## Post-MVP — AI 도입 / 고도화 (DEFERRED)

**상태: ⏸ 보류** — Workers KR PoP 의 Gemini geo-restriction + 우회 인프라 비용 + 사용 패턴(어차피 수정) 을 이유로 무기한 보류. 재도입 시 [`archive/prompts_model.md`](./archive/prompts_model.md) 의 1차 설계를 출발점으로 사용.

### 잠재적 작업 항목
- AI 우회 인프라 결정 (AI Gateway / Vertex AI / 다른 region 의 Worker / Edge proxy)
- 코치 모드 LLM 보조: 수동 빌더 위에 "초안 자동 생성" 옵션을 얹는 형태로 구상
- 실시간 중량 조절: 훈련 화면 ±10% 초과 시 LLM 호출 → 계획 무게 갱신
- 분석 인사이트: training_logs + user_conditions 교차 분석 → 인사이트 카드 (D 섹션)

### 그 외 Post-MVP 후보
- 멀티 유저 전환 (B1 → 인증/회원가입 흐름)
- 추가 주기화 모델 (5/3/1, GZCL 등)
- 분석 인사이트 푸시/이메일 알림
- D1 → R2 백업 자동화 (B Open Questions)
- 음성 입력 / 자동 동기화 등 UX 개선

---

## 진행 시 갱신 규칙
- Phase 진입 시 상태 ⏳ → 🚧 변경
- Phase 완료 시 🚧 → ✅ + 완료일 기재
- Done definition 항목은 작업 중 추가/조정 가능 (변경은 git log 로 추적)
- 새 Phase (5+) 추가 시 이 문서에 섹션 추가
