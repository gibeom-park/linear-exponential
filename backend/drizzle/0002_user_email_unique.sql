-- Phase 4: 멀티유저 전환 — users.email NOT NULL UNIQUE.
-- Cf-Access-Authenticated-User-Email 헤더로 매핑하므로 빈 값 금지.
-- 기존 단일 유저 (id=1) 의 email NULL 인 경우 owner 이메일로 백필.
UPDATE `users` SET `email` = 'kibumchy@gmail.com' WHERE `email` IS NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "created_at", "updated_at") SELECT "id", "email", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
