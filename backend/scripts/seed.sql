-- Phase 1 seed. idempotent (INSERT OR IGNORE).
-- 출처: docs/exercises_seed.md (107 운동)

INSERT OR IGNORE INTO users (id, email) VALUES (1, NULL);

INSERT OR IGNORE INTO settings (id, user_id, unit_system, e1rm_formula, main_deadlift_stance)
  VALUES (1, 1, 'kg', 'epley', 'conventional');

-- ===== 메인 (3) =====
INSERT OR IGNORE INTO exercises (name, kind, parent_lift, muscle_group) VALUES
  ('백 스쿼트', 'main', 'squat', 'none'),
  ('벤치 프레스', 'main', 'bench', 'chest'),
  ('데드리프트', 'main', 'deadlift', 'posterior_chain');

-- ===== 변형 — 스쿼트 (18) =====
INSERT OR IGNORE INTO exercises (name, kind, parent_lift, muscle_group) VALUES
  ('정지 스쿼트', 'variation', 'squat', 'none'),
  ('로우 박스 스쿼트', 'variation', 'squat', 'none'),
  ('와이드 로우 박스 스쿼트', 'variation', 'squat', 'none'),
  ('내로우 로우 박스 스쿼트', 'variation', 'squat', 'none'),
  ('핀 스쿼트', 'variation', 'squat', 'none'),
  ('앤더슨 스쿼트', 'variation', 'squat', 'none'),
  ('와이드 스탠스 스쿼트', 'variation', 'squat', 'none'),
  ('와이드 박스 스쿼트', 'variation', 'squat', 'none'),
  ('와이드 정지 스쿼트', 'variation', 'squat', 'none'),
  ('프론트 스쿼트', 'variation', 'squat', 'none'),
  ('내로우 스쿼트', 'variation', 'squat', 'none'),
  ('내로우 박스 스쿼트', 'variation', 'squat', 'none'),
  ('클로즈 스탠스 하이바 스쿼트', 'variation', 'squat', 'none'),
  ('핵 스쿼트', 'variation', 'squat', 'none'),
  ('바벨 핵 스쿼트', 'variation', 'squat', 'none'),
  ('하이 박스 스쿼트', 'variation', 'squat', 'none'),
  ('스피드 스쿼트', 'variation', 'squat', 'none'),
  ('밴드 스쿼트', 'variation', 'squat', 'none');

-- ===== 변형 — 벤치 프레스 (17) =====
INSERT OR IGNORE INTO exercises (name, kind, parent_lift, muscle_group) VALUES
  ('정지 프레스', 'variation', 'bench', 'chest'),
  ('와이드-그립 정지 프레스', 'variation', 'bench', 'chest'),
  ('스포토 프레스', 'variation', 'bench', 'chest'),
  ('와이드 스포토 프레스', 'variation', 'bench', 'chest'),
  ('2-보드 프레스', 'variation', 'bench', 'chest'),
  ('3-보드 프레스', 'variation', 'bench', 'chest'),
  ('4-보드 프레스', 'variation', 'bench', 'chest'),
  ('5-보드 프레스', 'variation', 'bench', 'chest'),
  ('클로즈 그립 보드 프레스', 'variation', 'bench', 'chest'),
  ('폼 보드 프레스', 'variation', 'bench', 'chest'),
  ('핀 프레스', 'variation', 'bench', 'chest'),
  ('와이드 그립 벤치 프레스', 'variation', 'bench', 'chest'),
  ('인클라인 프레스', 'variation', 'bench', 'chest'),
  ('클로즈 그립 벤치 프레스', 'variation', 'bench', 'triceps'),
  ('플로어 프레스', 'variation', 'bench', 'chest'),
  ('스피드 벤치', 'variation', 'bench', 'chest'),
  ('밴드 벤치', 'variation', 'bench', 'chest');

-- ===== 변형 — 데드리프트 (23) =====
INSERT OR IGNORE INTO exercises (name, kind, parent_lift, muscle_group) VALUES
  ('데피싯 데드리프트 (1인치)', 'variation', 'deadlift', 'posterior_chain'),
  ('데피싯 데드리프트 (2인치)', 'variation', 'deadlift', 'posterior_chain'),
  ('데피싯 데드리프트 (3인치)', 'variation', 'deadlift', 'posterior_chain'),
  ('데피싯 데드리프트 (4인치)', 'variation', 'deadlift', 'posterior_chain'),
  ('스내치 그립 데드리프트', 'variation', 'deadlift', 'posterior_chain'),
  ('반대 스탠스 데드리프트', 'variation', 'deadlift', 'posterior_chain'),
  ('랙 풀 (무릎 아래)', 'variation', 'deadlift', 'posterior_chain'),
  ('랙 풀 (무릎)', 'variation', 'deadlift', 'posterior_chain'),
  ('랙 풀 (무릎 위)', 'variation', 'deadlift', 'posterior_chain'),
  ('블록 풀 (1인치)', 'variation', 'deadlift', 'posterior_chain'),
  ('블록 풀 (2인치)', 'variation', 'deadlift', 'posterior_chain'),
  ('블록 풀 (3인치)', 'variation', 'deadlift', 'posterior_chain'),
  ('블록 풀 (4인치)', 'variation', 'deadlift', 'posterior_chain'),
  ('정지 데드리프트 (무릎 아래)', 'variation', 'deadlift', 'posterior_chain'),
  ('정지 데드리프트 (무릎)', 'variation', 'deadlift', 'posterior_chain'),
  ('1+½ 데드리프트', 'variation', 'deadlift', 'posterior_chain'),
  ('체어 데드리프트', 'variation', 'deadlift', 'posterior_chain'),
  ('수트케이스 데드리프트', 'variation', 'deadlift', 'core'),
  ('스트레이트 레그 데드리프트', 'variation', 'deadlift', 'posterior_chain'),
  ('루마니안 데드리프트', 'variation', 'deadlift', 'posterior_chain'),
  ('등척성 미드-타이 풀', 'variation', 'deadlift', 'posterior_chain'),
  ('스피드 데드리프트', 'variation', 'deadlift', 'posterior_chain'),
  ('밴드 데드리프트', 'variation', 'deadlift', 'posterior_chain');

-- ===== 보조 — quad (8) =====
INSERT OR IGNORE INTO exercises (name, kind, parent_lift, muscle_group) VALUES
  ('레그 익스텐션', 'accessory', 'none', 'quad'),
  ('와이드 레그 프레스', 'accessory', 'none', 'quad'),
  ('내로우 레그 프레스', 'accessory', 'none', 'quad'),
  ('레그 프레스', 'accessory', 'none', 'quad'),
  ('불가리안 스플릿 스쿼트', 'accessory', 'none', 'quad'),
  ('뒷다리 올린 스플릿 스쿼트', 'accessory', 'none', 'quad'),
  ('런지', 'accessory', 'none', 'quad'),
  ('스텝백 런지', 'accessory', 'none', 'quad');

-- ===== 보조 — posterior_chain (11) =====
INSERT OR IGNORE INTO exercises (name, kind, parent_lift, muscle_group) VALUES
  ('굿모닝', 'accessory', 'none', 'posterior_chain'),
  ('스트레이트 레그 굿모닝', 'accessory', 'none', 'posterior_chain'),
  ('힙 쓰러스트', 'accessory', 'none', 'posterior_chain'),
  ('바벨 글루트 브릿지', 'accessory', 'none', 'posterior_chain'),
  ('글루트 햄 레이즈', 'accessory', 'none', 'posterior_chain'),
  ('리버스 하이퍼익스텐션', 'accessory', 'none', 'posterior_chain'),
  ('백 익스텐션', 'accessory', 'none', 'posterior_chain'),
  ('풀스루', 'accessory', 'none', 'posterior_chain'),
  ('시티드 레그 컬', 'accessory', 'none', 'posterior_chain'),
  ('라잉 레그 컬', 'accessory', 'none', 'posterior_chain'),
  ('싱글 레그 컬', 'accessory', 'none', 'posterior_chain');

-- ===== 보조 — back (11) =====
INSERT OR IGNORE INTO exercises (name, kind, parent_lift, muscle_group) VALUES
  ('친업', 'accessory', 'none', 'back'),
  ('풀업', 'accessory', 'none', 'back'),
  ('랫 풀다운', 'accessory', 'none', 'back'),
  ('체스트 서포티드 로우', 'accessory', 'none', 'back'),
  ('와이드 그립 로우', 'accessory', 'none', 'back'),
  ('내로우 그립 로우', 'accessory', 'none', 'back'),
  ('패러럴 그립 로우', 'accessory', 'none', 'back'),
  ('클로즈 뉴트럴 그립 로우', 'accessory', 'none', 'back'),
  ('트랩 바 슈러그', 'accessory', 'none', 'back'),
  ('스트레이트 바 슈러그', 'accessory', 'none', 'back'),
  ('덤벨 슈러그', 'accessory', 'none', 'back');

-- ===== 보조 — chest (5) =====
INSERT OR IGNORE INTO exercises (name, kind, parent_lift, muscle_group) VALUES
  ('체스트 딥스', 'accessory', 'none', 'chest'),
  ('케이블 체스트 플라이', 'accessory', 'none', 'chest'),
  ('머신 체스트 플라이', 'accessory', 'none', 'chest'),
  ('덤벨 벤치 프레스', 'accessory', 'none', 'chest'),
  ('덤벨 인클라인 프레스', 'accessory', 'none', 'chest');

-- ===== 보조 — shoulder (4) =====
INSERT OR IGNORE INTO exercises (name, kind, parent_lift, muscle_group) VALUES
  ('오버헤드 프레스', 'accessory', 'none', 'shoulder'),
  ('아놀드 프레스', 'accessory', 'none', 'shoulder'),
  ('스탠딩 덤벨 숄더 프레스', 'accessory', 'none', 'shoulder'),
  ('시티드 덤벨 숄더 프레스', 'accessory', 'none', 'shoulder');

-- ===== 보조 — triceps (7) =====
INSERT OR IGNORE INTO exercises (name, kind, parent_lift, muscle_group) VALUES
  ('JM 프레스', 'accessory', 'none', 'triceps'),
  ('케이블 트라이셉 익스텐션', 'accessory', 'none', 'triceps'),
  ('로프 트라이셉 익스텐션', 'accessory', 'none', 'triceps'),
  ('덤벨 트라이셉 익스텐션', 'accessory', 'none', 'triceps'),
  ('밴드 트라이셉 익스텐션', 'accessory', 'none', 'triceps'),
  ('오버헤드 트라이셉 익스텐션', 'accessory', 'none', 'triceps'),
  ('바벨 트라이셉 익스텐션', 'accessory', 'none', 'triceps');
