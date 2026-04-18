# 프롬프트 / LLM 파이프라인 모델

C 섹션 결정사항 정리. C2 (프롬프트 관리) 중심 + C1 (스키마 위치) / C4 (모델 선택) 일부 포함.

마지막 갱신: 2026-04-18 — C2 결정 + C1/C4 부분 결정.

- 도메인 결정은 [`domain_model.md`](./domain_model.md), 인프라는 [`infra_model.md`](./infra_model.md), 트래커는 [`total_plan_suggestions.md`](./total_plan_suggestions.md)

---

## 1. 프롬프트 위치 / 형식 (C2-a, C2-c)

### 결정
- 위치: **외부 `.md` 파일** (`backend/prompts/`)
- 빌드: esbuild 의 `?raw` import 또는 vite raw loader 로 string 포함 → 런타임에 fetch 불필요
- 형식: frontmatter (YAML) + 본문 (`# System`, `# User` 섹션)

### 파일 구조 예시
```markdown
---
id: coach_linear
version: 1
description: Linear periodization 블럭 생성
input_vars: [weeks, days_per_week, squat_1rm, bench_1rm, deadlift_1rm, deadlift_stance, weak_points]
output_schema: shared/validators/llm/coach_output.ts
model: gemini-flash
---

# System

당신은 파워리프팅 코치입니다 ...

# User

다음 입력에 맞춰 {{weeks}}주짜리 linear periodization 블럭을 생성하세요.
- 주당 {{days_per_week}}일
- 현재 1RM: 스쿼트 {{squat_1rm}}, 벤치 {{bench_1rm}}, 데드 {{deadlift_1rm}} kg
- 메인 데드: {{deadlift_stance}}
- 약점: {{weak_points}}

JSON 출력만 반환:
{ "weeks": [...] }
```

### frontmatter 필드 의미
| 필드 | 용도 |
|---|---|
| `id` | 프롬프트 식별자 (DB 적재용) |
| `version` | 사람이 의도적으로 올리는 정수 (DB 컬럼) |
| `description` | 검색·디버깅용 한 줄 |
| `input_vars` | `{{var}}` 치환 시 필수 변수 목록 (검증) |
| `output_schema` | Zod 스키마 파일 경로 (`shared/validators/llm/`) |
| `model` | default 모델 ID (env `GEMINI_MODEL` 이 우선) |

---

## 2. 디렉토리 구조 (C2-b)

```
backend/prompts/
  coach_linear.md
  coach_dup.md
  coach_block.md
  coach_conjugate.md
  coach_realtime_adjust.md      # 훈련 중 ±10% 초과 무게 조정 시 (domain_model §6)
  analysis_insights.md          # 사후 분석 인사이트 도출 (Phase 4)
  _shared/
    persona.md                  # 공통 페르소나/톤 (선택, optional include)
  lib/
    render.ts                   # frontmatter 파싱 + {{var}} 치환
    types.ts                    # PromptMetadata, RenderedPrompt 등
```

### 작성 원칙
- **self-contained**: 4개 코치 프로그램 프롬프트는 각자 완결. `_shared/` 는 옵션
- **DRY 보다 명확함 우선**: 4파일 중복 비용 작음, 디버깅 시 단일 파일만 보면 됨

---

## 3. 변수 치환 (C2-d)

- 형식: **`{{var}}` 단순 replace**
- 구현: `backend/prompts/lib/render.ts` 에 30줄짜리 함수 (외부 의존성 0)
- 누락 변수 시 빌드/런타임 에러로 즉시 fail
- 입력 검증: frontmatter `input_vars` 와 호출 시 전달된 객체의 키 비교

```ts
// backend/prompts/lib/render.ts (의사 코드)
export function render(prompt: PromptFile, vars: Record<string, string | number>): RenderedPrompt {
  // 1. input_vars 누락 검증 → 에러
  // 2. body 에서 {{var}} 패턴을 vars[var] 로 치환
  // 3. system / user 섹션 분리 → Gemini API 호출 형태로 반환
}
```

---

## 4. 버전 관리 / DB 기록 (C2-e)

### 결정
- DB `program_blocks` 에 두 컬럼 추가:
  - `prompt_version` INTEGER — frontmatter 의 `version` 값
  - `prompt_hash` TEXT — 프롬프트 본문의 sha256 (자동 계산)
- frontmatter `version` 안 올리고 본문만 수정해도 hash 로 변경 추적 가능

### 운영 흐름
1. 프롬프트 본문 수정 시 frontmatter version 도 함께 ↑ (의도 표시)
2. 빌드 시 hash 자동 계산 → 코드에 상수로 박힘
3. 코치 모드 호출 시 두 값을 `program_blocks` 에 함께 기록
4. 분석 시 "이 블럭은 v3 프롬프트로 생성됨" 추적 가능

---

## 5. 입출력 스키마 위치 (C1 부분)

### 결정
- 위치: **`shared/validators/llm/`**
- 파일: `coach_output.ts`, `realtime_adjust_output.ts`, `analysis_insights_output.ts`
- 이유: frontend 도 LLM 응답 타입을 알아야 하는 경우가 있음 (생성 결과 미리보기 등). `shared/` 가 자연스러움
- 프롬프트 frontmatter `output_schema` 가 이 경로를 참조 (빌드 시 정적 검증)

### 검증 흐름
1. Worker 가 Gemini 호출 → JSON 응답 받음
2. `shared/validators/llm/coach_output.ts` 의 Zod 스키마로 `parse()`
3. 실패 시 재시도 (최대 N회) → 그래도 실패면 사용자에게 에러 + 디폴트 프로그램 폴백 옵션
4. 성공 시 DB 적재

---

## 6. 모델 선택 (C4 부분)

### 결정
- 환경변수 `GEMINI_MODEL` 로 모델 ID 외부화
- 프롬프트 frontmatter `model` 은 default, env 가 우선
- default 값은 **Phase 2 진입 시점에 Google 공식 문서 확인 후 확정** (지금 ID 박아두면 outdated 가능)
- 선택 기준: Gemini Flash 계열 최신 + 무료 티어 한도가 넓은 모델

### 함의
- `backend/.dev.vars.example` 에 `GEMINI_MODEL=` 빈 값으로 템플릿
- `wrangler.toml` 에 vars 로 default 박지 않고 env override 만 사용

---

## 7. Deferred (C3, C5)

### C3 — 컨텍스트 압축
Phase 4 (분석 모드) 진입 시 결정. 지금 가정:
- 코치 모드 첫 블럭 생성: 사용자 입력만 (이전 데이터 없음)
- 두 번째 블럭 이후: 직전 블럭 raw 데이터 통째 전달 (token 한도 내)
- 한도 초과 시 결정 미룸

### C5 — 비용 / 레이트 제한
운영 단계 결정. 지금 미리 박아둘 hook:
- Worker 에 호출 카운터 (`kv:gemini_call_count` 또는 D1 테이블)
- 일일 한도 도달 시 503 + 사용자 안내 메시지

---

## Open Questions

- 프롬프트 파일 빌드 방식: esbuild `?raw` import vs 빌드 시 `prompts.ts` 자동 생성 — Phase 1 셋업에서 esbuild 설정 시 결정
- `_shared/persona.md` 를 실제로 만들지 (옵션) — 4개 프로그램 프롬프트 작성하다 중복 톤이 보이면 그때 추출
- LLM 호출 실패 시 폴백 정책: 재시도 횟수 / 디폴트 프로그램 / 사용자 알림 형식 — Phase 2 시작 시 결정
