CREATE TABLE `packages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`weekly_downloads` integer DEFAULT 0,
	`repository` text,
	`homepage` text,
	`last_update` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `preset_packages` (
	`preset_id` text NOT NULL,
	`package_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	PRIMARY KEY(`preset_id`, `package_id`),
	FOREIGN KEY (`preset_id`) REFERENCES `presets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON UPDATE no action ON DELETE no action
);
