# 도메인 모델 (결정된 사항)

`total_plan.md` 의 도메인 결정사항을 한 곳에 모은 문서. 후속 결정이 추가될 때마다 이 문서를 갱신.

마지막 갱신: 2026-04-18 — A1~A4 1차 결정 + Open Questions 6건 해소 (단위, 변형/보조 출처, e1RM default, 저-일수 호환성, 무게 조정).

---

## 1. 블럭 / 세션 구조 (A1)

### 결정
- **블럭 길이**: 3~8주 (사용자 입력)
- **주당 운동 일수**: 1~7일 (사용자 입력)
- **기본값**: 4주, 주 4일
- **계층**: `block → week → session(day) → exercise → set`

### 데이터 함의
- 신규 테이블 `program_blocks` 필요. 컬럼 후보:
  - `id`, `created_at`
  - `weeks` (3~8 CHECK)
  - `days_per_week` (1~7 CHECK)
  - `program_type` (FK → 2번 섹션 카탈로그)
  - `formula_type` (FK → 3번 섹션 카탈로그)
  - `prompt_version` (LLM 프롬프트 버전 기록 — 추후 C2 와 연결)
- 기존 `program_sets` 에 추가 컬럼: `block_id`, `week_no` (1..weeks), `day_no` (1..days_per_week), `set_no`

### UI 함의
- 코치 모드 진입 시 블럭 생성 폼: 주수 슬라이더(3~8) + 주당 일수 슬라이더(1~7), 기본값 표시

### 프롬프트 함의
- LLM 입력에 `weeks`, `days_per_week` 를 명시적으로 전달

---

## 2. 주기화 프로그램 (A2)

### 결정
- **카탈로그 (4종)**: `linear` (기본) / `dup` / `block` / `conjugate`
- 사용자가 코치 모드 진입 시 4개 중 선택
- 각 프로그램 카드에 짧은 설명 표시

### 데이터 함의
- `program_blocks.program_type` 컬럼 (enum: linear/dup/block/conjugate)
- 카탈로그 메타는 코드 상수 또는 별도 테이블 `programs(id, display_name, short_description, prompt_path)`
  - 4종 고정이고 자주 안 바뀌므로 **코드 상수** 가 가벼움

### 프롬프트 함의
- 프롬프트 파일 위치: `backend/prompts/coach_{program_type}.md`
  - `coach_linear.md`, `coach_dup.md`, `coach_block.md`, `coach_conjugate.md`
- 공통 입력 schema 정의 + 프로그램별 프롬프트가 그 위에서 작성 규칙을 specialize

### UI 함의
- 4개 프로그램 카드 컴포넌트 (id, display_name, short_description, 선택 라디오)
- 각 카드의 short_description 은 도메인 자료에서 끌어옴 → `docs/periodization_models.md` (1종당 2~3줄)

---

## 3. 강도 / e1RM (A3)

### 결정
- **강도 1차 입력**: RPE
- **e1RM 공식 카탈로그 (4종)**: `epley` (default) / `brzycki` / `lombardi` / `oconner`
- 사용자가 공식 선택, UI 에 공식 설명 표시
- **단위**: kg ↔ lb 토글 (사용자 설정, §5 참조)

### 데이터 함의
- e1RM 공식 / 단위 모두 사용자 설정 → §5 참조
- `training_logs.weight` 는 **항상 kg 로 저장 (canonical)**, 표시 시 사용자 단위로 변환
- `training_logs` 에는 raw 데이터(weight/reps/RPE)만 저장 — e1RM 은 조회 시 동적 계산 (공식 변경 영향을 즉시 반영)

### UI 함의
- 설정 화면에 4개 공식 라디오 + 각 공식의 수식/장단점 1줄 노출
- 무게 입력 필드는 사용자 단위로 표시·입력, 저장 시 kg 로 변환

### 도메인 자료 함의
- `docs/e1rm_formulas.md`: 4개 공식의 수식 + reps 구간별 정확도 + 추천 사용처
- 가능하면 RPE→%1RM 변환 차트도 동일 문서에 (RPE 기반 e1RM 추정에 필요)

---

## 4. 운동 사전 / 훈련 모드 UI (A4)

### 결정
- **운동 분류 (3종 kind)**:
  - `main`: SBD 메인 3종 (백 스쿼트 / 벤치 프레스 / 데드리프트)
  - `variation`: SBD 각각의 스타일·도구 변형 (예: 정지 스쿼트, 보드 프레스, 데피싯 데드)
  - `accessory`: 보조 운동 (hip-hinge / 등 / 가슴 / 어깨 / 삼두 / 다리 등)
- **출처**: `docs/Powerlifting_Sticking_Points.md` 의 운동들을 위 3종으로 카테고리화
  - SBD 변형은 `variation` 으로, 그 외는 `accessory` 로
  - 시드 자료는 `docs/exercises_seed.md` 에 별도 정리
- **훈련 시트 표시**: 시스템이 그날의 시트를 자동으로 표시 (사용자는 확인만)
- **사용자 입력**: RPE + (필요 시) ±10% 이내 무게 조정 (§6 참조)

### 데이터 함의
- `exercises` 마스터 컬럼:
  - `id`, `name`, `notes`
  - `kind` enum: `main` / `variation` / `accessory`
  - `parent_lift` enum: `squat` / `bench` / `deadlift` / `none`
    - `main` / `variation` 은 `squat`/`bench`/`deadlift` 중 하나
    - `accessory` 는 `none`
  - `muscle_group` (accessory 용): `quad` / `posterior_chain` / `back` / `chest` / `shoulder` / `triceps` 등
- 시드 데이터: `docs/exercises_seed.md` 참조 (메인 3 + 변형 약 45종 + 보조 약 30종)

### UI 함의 (훈련 모드 진입 플로우)
1. 진입 → 사전 체크인 (수면/컨디션/체중)
2. 오늘 세션 카드 자동 표시 (운동 목록 + 계획된 세트)
3. 세트별 row: 계획 reps×weight 표시, 사용자는 수행 후 RPE 기입 + 필요 시 무게 ±10% 조정
4. 세션 완료 버튼 → `training_logs` 일괄 저장

### 프롬프트 함의
- 코치 모드 LLM 에 SBD 메인 + 변형 + 보조 조합 규칙 전달 (예: "메인 1종 + 변형 1~2종 + 보조 1~3종을 한 세션에 배치")
- 운동 카탈로그를 LLM 컨텍스트에 전달할 때 `kind` / `parent_lift` / `muscle_group` 메타데이터 포함

---

## 5. 사용자 설정 (신규)

사용자가 토글하는 환경 설정을 한 곳에 모음.

### 결정
- **단위**: kg ↔ lb 토글 (default kg 가정)
- **e1RM 공식**: epley (default) / brzycki / lombardi / oconner
- **메인 데드리프트 스탠스**: conventional / sumo (사용자 본인의 메인 스타일)

### 데이터 함의
- 단일 유저 가정: `settings` 단일행 테이블 또는 KV 키 (`user:settings`)
- 멀티 유저 결정 시 (B1) → `users` 테이블의 컬럼으로 흡수
- 컬럼 후보: `unit_system` / `e1rm_formula` / `main_deadlift_stance`

### UI 함의
- 설정 화면 1개에서 위 3종을 모두 토글
- 단위 변경 시 모든 무게 표시값 즉시 환산

### 저-일수 + 고볼륨 프로그램 호환성
- LLM 에 별도 제약을 두지 않음 (사용자 자율 판단)
- 다만 프롬프트에 "주당 일수가 적을 경우 세션당 볼륨이 늘어남을 고려" 정도의 가이드만 포함

---

## 6. 훈련 중 조정 정책 (신규)

### 결정
- 사용자는 세트별 **계획 무게의 ±10% 범위** 내에서 무게 수정 가능
- 그 외 (±10% 초과 또는 reps 자체 변경) 변경은 코치 모드의 "실시간 중량 조절" 플로우로 우회 (Gemini 호출 후 계획 자체 수정)

### 데이터 함의
- `training_logs` 에 두 컬럼:
  - `weight_planned` (kg, 계획값)
  - `weight_actual` (kg, 실제 수행값)
- 분석 모드에서 두 값의 편차를 추적 가능 (예: "계획 대비 실제 무게가 평균 X% 낮음")

### UI 함의
- 무게 입력 필드에 ±10% 가드 (90~110% 범위 외 입력 시 비활성화 또는 경고)
- 초과 변경 시도 시 "코치에게 다시 물어보기" 버튼 노출 → 코치 모드의 실시간 조절 API 호출

### 프롬프트 함의
- 실시간 조절 API 는 별도 프롬프트 (`backend/prompts/coach_realtime_adjust.md`)
- 입력: 현재 세션 컨텍스트, 사용자가 요청한 변경 사유, 계획 무게
- 출력: 새 계획 무게 + 한 줄 코칭 코멘트

---

## Open Questions (후속 결정 필요)

직전의 6건은 모두 해결. 새로 떠오른 작은 미결사항만 남김:

- **메인 데드리프트 스탠스 위치**: 사용자 설정(§5) 으로 두는 게 맞는지, 운동 카탈로그(§4) 의 별도 운동(`conventional_deadlift`, `sumo_deadlift`) 으로 두는 게 맞는지
- **±10% 의 적용 단위**: 세트별인지 (현재 가정), 세션 전체 평균인지
- **도구/컨디셔닝 운동 카탈로그 포함 여부**: 슬링샷, 박스 점프, 썰매 끌기 등은 시드에서 일단 제외 — 추후 별도 카테고리(`tool` / `conditioning`) 로 추가할지
- **저-일수 + 고볼륨 조합 시 사용자 경고 노출**: 프롬프트 처리 외에 UI 에서 경고 카드를 띄울지
