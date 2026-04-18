## 1. 프로젝트 개요
- 목표: 단순 기록을 넘어 훈련 데이터(볼륨, 강도)와 통제 변수(수면, 컨디션) 간의 인과관계를 분석하고 퍼포먼스를 극대화하는 맞춤형 스트렝스 관리 시스템 구축.
- 핵심 가치: * Cloudflare 생태계를 활용한 무서버(Serverless) 및 제로 코스트(Zero-cost) 지향 인프라.
- LLM(Gemini API)를 통한 지능형 자기 조절(Auto-regulation) 및 맞춤형 블럭 설계.

## 2. 기술 스택 및 인프라
- Frontend: Cloudflare Pages (React 등) / 헬스장 환경에 최적화된 모바일 PWA(Progressive Web App).
- Backend: Cloudflare Workers (경량 API 라우팅 및 LLM 통신).
- Database: Cloudflare D1 (SQLite 기반 관계형 DB - 분석 쿼리에 최적화).
- State Management: Cloudflare KV (오프라인/새로고침 대비 임시 훈련 데이터 캐싱).
- AI Engine: Gemini 1.5 Flash API (JSON 구조화 출력 및 컨텍스트 기반 피드백).

## 3. 핵심 모듈 (User Flow)
### 1. 코치 모드 (/coach) : 적응형 프로그램 빌딩
- 입력: 현재 1RM, 이전 블럭 성과, 약점 구간, 가용 훈련일 등 사용자 피드백.
- 로직: Gemini API가 exercises 테이블을 참조하여 4~8주 분량의 최적화된 훈련 블럭을 JSON 형태로 반환.
- 출력: 생성된 스케줄을 program_sets 데이터베이스에 적재.

### 2. 훈련 모드 (/train) : 당일 수행 및 실시간 피드백
- 사전 체크인: 당일 수면 시간(0.5h 단위), 컨디션(1~5), 현재 체중을 user_conditions에 기록.
- 실시간 중량 조절 (On-demand): 웜업 RPE나 수면 부족 등 특이 사항 발생 시, Gemini에 질의하여 당일 탑 세트의 목표 중량을 상/하향 조정.
- 수행 완료: 실제 리프팅 중량, 횟수, RPE를 training_logs에 저장.

### 3. 사후 분석 모드 (Analysis) : 인과관계 리뷰
- 기능: 블럭 종료 시 user_conditions와 training_logs를 교차 분석.
- 인사이트 도출: "수면 6.5시간 미만일 때 데드리프트 실패율 증가", "정지 스쿼트 보조 운동이 메인 스쿼트 1RM 향상에 미친 긍정적 효과" 등의 데이터 기반 회고 및 다음 블럭 방향성 제안.

## 4. 데이터베이스 아키텍처 (Cloudflare D1)
- 전처리 소요를 최소화하고 즉각적인 데이터 집계가 가능하도록 정규화된 Tidy Data 형태를 유지합니다.
- exercises: 메인, 변형, 보조 운동 마스터 사전 (특이사항 포함).
- user_conditions: 훈련 당일의 상태 변수 (수면, 컨디션, 체중).
- program_sets: 코치 모드에서 계획된 1세트/1행 단위의 타겟 데이터.
- training_logs: 훈련 모드에서 기록된 실제 수행 결과 데이터.

## 5. 단계별 개발 로드맵
- Phase 1 (인프라 & DB): Cloudflare 세팅 및 D1 테이블 스키마 생성.
- Phase 2 (코치 모드 MVP): Gemini 프롬프트 엔지니어링 및 완벽한 JSON 포맷 파이프라인 구축.
- Phase 3 (훈련 모드 MVP): 체크인 UI 및 훈련 당일 기록 시스템 구현.
- Phase 4 (AI 고도화): 실시간 중량 조절 챗봇 연동 및 훈련 후 사후 분석 로직 개발.
