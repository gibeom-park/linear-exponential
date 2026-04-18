# `plan/total_plan.md` 보강 제안

`plan/total_plan.md` 를 검토한 결과, 구현 단계로 넘어가기 전에 결정/명시가 필요해 보이는 항목들을 우선순위별로 정리.

다음 시점에서 "안 정해뒀네" 가 터질 가능성이 높음:
- DB 스키마를 D1 에 옮길 때 → user/auth/단위/RPE 정책 누락
- 코치 모드 첫 프롬프트 작성 시 → 블럭/주차/세션 계층, 주기화 모델 미정의
- 훈련 모드 PWA 화면 띄울 때 → 오프라인-온라인 동기화 전략 미정
- LLM 응답을 DB 에 적재할 때 → 스키마 검증/실패 폴백 미정

---

## A. 도메인 모델 (가장 시급 — DB/프롬프트가 여기에 종속됨)

> **A1~A4 모두 결정 완료 (2026-04-18).** 결정 내용과 데이터/UI/프롬프트 함의는 [`domain_model.md`](./domain_model.md), 운동 시드는 [`docs/exercises_seed.md`](../../docs/exercises_seed.md) 참조.

### A1. 블럭 / 주차 / 세션 / 세트 계층 정의 — DECIDED
- 블럭 길이: 3~8주 (기본 4주)
- 주당 일수: 1~7일 (기본 4일)
- 계층: `block → week → session(day) → exercise → set`

### A2. 주기화(Periodization) 모델 — DECIDED
- 카탈로그: Linear (기본) / DUP / Block / Conjugate
- 사용자가 코치 모드 진입 시 카드 형태로 선택, 프로그램별 프롬프트 활성화

### A3. 강도/볼륨 표기 표준 — DECIDED
- 강도 1차 입력: RPE
- e1RM 공식: Epley (default) / Brzycki / Lombardi / O'Conner — 사용자 선택
- 단위: kg ↔ lb 토글 (사용자 설정)

### A4. 운동(`exercises`) 마스터 사전 분류 체계 — DECIDED
- 분류: main / variation / accessory (3종 kind)
- 출처: `docs/Powerlifting_Sticking_Points.md` 의 운동들을 카테고리화 → `docs/exercises_seed.md`
- 훈련 중 무게 조정: 계획 무게의 ±10% 범위 내 허용 (그 이상은 코치 모드 우회)

---

## B. 데이터/인프라 (Phase 1 들어가기 전 결정)

> **B1~B4 모두 결정 완료 (2026-04-18).** 결정 내용과 함의는 [`infra_model.md`](./infra_model.md) 참조.

### B1. 사용자 모델 — DECIDED
- 단일 유저로 시작 + `user_id` FK 절충형 (모든 테이블에 FK 박아두고 default user_id=1)

### B2. 인증 전략 — DECIDED
- Cloudflare Access (Zero Trust, 무료 플랜)
- Gemini API 키: Workers Secrets, 프론트 노출 금지

### B3. 마이그레이션 / ORM 도구 — DECIDED
- Drizzle ORM + Drizzle Kit (D1 first-class)
- pnpm workspace (`frontend/`, `backend/`, `shared/`)

### B4. 오프라인 / 동기화 전략 — DECIDED
- IndexedDB (`idb` 라이브러리), Last-Write-Wins
- Service Worker: cache-first (앱 셸) / network-first (API) / SWR (카탈로그)
- `vite-plugin-pwa` (Workbox wrapper)

---

## C. LLM 파이프라인 (Phase 2 핵심 리스크)

> **C2 결정 완료 + C1·C4 부분 결정 (2026-04-18).** 상세는 [`prompts_model.md`](./prompts_model.md). C3·C5 는 Phase 4 / 운영 단계 deferral.

### C1. 응답 스키마 검증 — PARTIAL
- Zod 스키마 위치: `shared/validators/llm/{coach,realtime_adjust,analysis}_output.ts`
- 재시도 / 폴백 정책 디테일은 Phase 2 시작 시 결정

### C2. 프롬프트 관리 — DECIDED
- 외부 `.md` 파일 (`backend/prompts/*`) + frontmatter (id/version/description/input_vars/output_schema/model)
- `{{var}}` 단순 치환, `coach_{linear,dup,block,conjugate}.md` + `coach_realtime_adjust.md` + `analysis_insights.md`
- DB 에 `prompt_version` (정수) + `prompt_hash` (sha256) 두 컬럼 기록

### C3. 컨텍스트 압축 — TODO (Phase 4)
- 첫 블럭: 사용자 입력만. 두 번째 이후: 직전 블럭 raw 데이터 통째 전달 (한도 내)

### C4. 모델 선택 — PARTIAL
- `GEMINI_MODEL` env 외부화 결정. frontmatter `model` 은 default
- 정확한 모델 ID 는 Phase 2 진입 시점에 Google 공식 문서 확인 후 확정

### C5. 비용/레이트 제한 — TODO (운영 단계)
- 호출 카운터 hook 만 미리 마련. 일일 한도 / 알림 정책은 운영 시 결정

---

## D. 분석 모드 구체화

### D1. "인과관계" 표현 재검토
본문에 "인과관계 분석" 이라고 적었지만 관측 데이터로 도출 가능한 건 **상관관계**. 표현을 "상관 분석 / 패턴 탐색" 으로 정정 권장.

### D2. 분석 방법
- 단순 집계(평균/실패율) vs 시계열 차트 vs 회귀
- 시각화 라이브러리 (Recharts / visx / Chart.js) 결정

### D3. 인사이트 트리거
- 자동 생성 인사이트의 임계 조건 정의 (예: "수면 N 시간 미만 세션의 실패율이 전체 평균의 X% 초과 시 경고")

---

## E. 운영/품질

> **E1, E2 결정 완료 (2026-04-18).** 상세는 [`infra_model.md`](./infra_model.md) §7. E3, E4 는 Phase 1 init / 운영 단계에서 결정.

### E1. 테스트 전략 — DECIDED
- 백엔드: Vitest + Miniflare + D1 local
- 프론트 단위: Vitest + Testing Library
- E2E: Playwright
- 린터/포매터: Biome

### E2. CI/CD — DECIDED
- GitHub Actions (lint → test → wrangler deploy)
- Cloudflare Pages preview 는 git 연동으로 자동

### E3. 로컬 개발 환경 — TODO (Phase 1 init 시)
- `wrangler dev` + D1 local 셋업 절차
- `pnpm` workspace scripts (`pnpm dev` 가 frontend + backend 동시 실행)

### E4. 모니터링/백업 — TODO (운영 단계)
- Workers Logs / Logpush 활용 여부
- D1 정기 export → R2 백업

---

## F. 로드맵 보강 — DECIDED

> Phase 0 (사전 결정) ~ Phase 4 (AI 고도화) 의 Done definition 체크리스트 + 검증 방법은 [`roadmap.md`](./roadmap.md) 참조.
>
> 현재 상태: Phase 0 ✅ 완료. Phase 1 진입 대기.

---

## 권장 다음 행동

1. ✅ A 섹션 결정 → `domain_model.md` + `docs/`
2. ✅ B 섹션 결정 → `infra_model.md`
3. ✅ C2 결정 → `prompts_model.md`
4. ✅ F 결정 → `roadmap.md`
5. ⏳ **Phase 1 init 시작** — pnpm workspace + wrangler + Drizzle 셋업
6. ⏳ Phase 2 진입 시 C1·C4 잔여 결정 (Gemini 모델 ID 확정, 재시도 정책)
7. ⏳ Phase 4 진입 시 D 섹션 결정 (분석 방법, 인사이트 트리거)
