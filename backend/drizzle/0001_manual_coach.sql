-- Phase 2 재구성: AI/Gemini 통합 제거 → 수동 코치 모드
-- program_blocks 재정의 (selectedDays/startDate/endDate/notes/deadliftStance 추가, programType/prompt_*/started_at/ended_at 제거)
-- program_sets 컬럼은 변경 없음. blockId FK 가 cascade 이므로 program_blocks DROP 하면 함께 비워짐.
-- 단일 유저 + 테스트 데이터뿐이므로 DROP + CREATE 로 안전하게 전환.

DROP TABLE IF EXISTS `program_sets`;
--> statement-breakpoint
DROP TABLE IF EXISTS `program_blocks`;
--> statement-breakpoint
CREATE TABLE `program_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`weeks` integer NOT NULL,
	`days_per_week` integer NOT NULL,
	`selected_days` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`squat_1rm_kg` real NOT NULL,
	`bench_1rm_kg` real NOT NULL,
	`deadlift_1rm_kg` real NOT NULL,
	`deadlift_stance` text NOT NULL,
	`notes` text,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `program_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`block_id` integer NOT NULL,
	`week_no` integer NOT NULL,
	`day_no` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`set_no` integer NOT NULL,
	`planned_reps` integer NOT NULL,
	`planned_weight_kg` real NOT NULL,
	`planned_rpe` real,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`block_id`) REFERENCES `program_blocks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
