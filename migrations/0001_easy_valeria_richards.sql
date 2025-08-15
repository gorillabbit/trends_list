PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_likes` (
	`user_id` text NOT NULL,
	`preset_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	PRIMARY KEY(`user_id`, `preset_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`preset_id`) REFERENCES `presets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_likes`("user_id", "preset_id", "created_at") SELECT "user_id", "preset_id", "created_at" FROM `likes`;--> statement-breakpoint
DROP TABLE `likes`;--> statement-breakpoint
ALTER TABLE `__new_likes` RENAME TO `likes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;