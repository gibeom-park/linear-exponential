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

### B1. 사용자 모델
현재 `users` 테이블이 스키마에 없음. 단일 사용자(본인만) 가정인지, 추후 멀티 유저로 갈지 결정 필요.
- 단일 유저: `user_id` 컬럼 생략 가능, 인증은 단순 토큰
- 멀티 유저: 처음부터 `user_id` FK 박아두는 편이 마이그레이션 비용 절감

### B2. 인증 전략
- Cloudflare Access (Zero Trust) / Workers 자체 JWT / 패스워드+세션 중 선택
- Gemini API 키 등 시크릿 → Workers Secrets 로 관리한다는 점 명시

### B3. 마이그레이션 / ORM 도구
- D1 마이그레이션: Wrangler `d1 migrations` vs Drizzle Kit
- 쿼리 레이어: raw SQL / Kysely / Drizzle ORM
- 프론트-백 타입 공유 전략 (단일 TS 모노레포? `pnpm` workspace?)

### B4. 오프라인 / 동기화 전략
"KV 로 임시 캐싱" 만 적혀 있고 동기화 규칙이 없음.
- 헬스장에서 오프라인 기록 → 온라인 복귀 시 충돌 해결 (last-write-wins / 사용자 선택)
- 클라이언트 저장: IndexedDB(브라우저) vs KV(엣지) 역할 분담
- Service Worker 캐싱 정책 (앱 셸 / API 응답)

---

## C. LLM 파이프라인 (Phase 2 핵심 리스크)

### C1. 응답 스키마 검증
- Gemini JSON 출력 → Zod (또는 valibot) 스키마로 강검증
- 검증 실패 시 재시도/폴백 정책

### C2. 프롬프트 관리
- 프롬프트를 코드에 인라인 vs 별도 파일(`backend/prompts/*.md`)
- 버전 관리: 프롬프트 변경 이력을 git 으로 추적 + 어떤 블럭이 어떤 프롬프트 버전으로 생성됐는지 DB 에 기록(`program_blocks.prompt_version`)

### C3. 컨텍스트 압축
- "이전 블럭 성과" 를 매번 LLM 에 통째로 넘기면 토큰 폭증 → 요약 또는 집계 통계만 전달하는 규칙 정의

### C4. 모델 선택
- `Gemini 1.5 Flash` 를 명시했는데, 2026-04 시점 더 최신 Gemini 라인업이 있을 수 있음 → "Flash 계열 최신" 으로 표현하고 모델 ID 는 환경변수화

### C5. 비용/레이트 제한
- Gemini 무료 티어 한도 / 일일 호출 상한
- 코치 모드(블럭당 1회) vs 훈련 모드(세션당 N회) 의 비용 차이 인지

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

### E1. 테스트 전략
- 백엔드: Vitest + Miniflare(Workers) + D1 local
- 프론트: 컴포넌트 테스트 / Playwright E2E
- LLM 응답 스키마 검증은 픽스처 기반 회귀 테스트

### E2. CI/CD
- GitHub Actions: lint → test → wrangler deploy
- PR 단위 Cloudflare Pages preview deploy

### E3. 로컬 개발 환경
- `wrangler dev` + D1 local + KV local 셋업 절차
- `frontend/`, `backend/` 동시 실행 방법 (Turborepo / pnpm scripts)

### E4. 모니터링/백업
- Workers Logs / Logpush 활용 여부
- D1 정기 export → R2 백업 (단일 명령으로 가능한 수준)

---

## F. 로드맵 보강

각 Phase 에 **완료 기준 (Done definition)** 을 1줄씩 추가하면 진행도 측정이 쉬움. 예:

- Phase 1 Done: `wrangler d1 execute` 로 4개 테이블 생성, 시드 운동 10종 적재, `SELECT * FROM exercises` 가 로컬·원격 양쪽 OK
- Phase 2 Done: 입력 폼 → Gemini 호출 → JSON 검증 통과 → `program_sets` 적재까지 한 번의 API 호출로 완결
- Phase 3 Done: 모바일 PWA 로 체크인/세트 기록/완료까지 오프라인 포함 동작
- Phase 4 Done: 분석 화면에서 최소 3종 인사이트 카드 자동 생성, 챗봇으로 당일 중량 조정 1회 시연

또한 **Phase 0 (선결)** 을 추가 권장:
- 도메인 모델(A 섹션) 합의 + `docs/` 에 운동 사전 / 주기화 모델 / 1RM 공식 문서화

---

## 권장 다음 행동

1. A 섹션(도메인 모델)을 먼저 결정 → `total_plan.md` 갱신
2. B/C 섹션은 Phase 1 / Phase 2 직전에 결정해도 됨
3. D/E/F 는 해당 Phase 진입 시점에 보강
