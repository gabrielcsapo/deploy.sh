CREATE TABLE `build_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deployment_name` text NOT NULL,
	`output` text NOT NULL,
	`success` integer NOT NULL,
	`duration` integer NOT NULL,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_build_logs_deployment` ON `build_logs` (`deployment_name`);--> statement-breakpoint
CREATE INDEX `idx_build_logs_timestamp` ON `build_logs` (`deployment_name`,`timestamp`);