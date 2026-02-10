CREATE TABLE `backups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deployment_name` text NOT NULL,
	`filename` text NOT NULL,
	`label` text,
	`size_bytes` integer NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`volume_paths` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_backups_deployment` ON `backups` (`deployment_name`);--> statement-breakpoint
CREATE INDEX `idx_backups_created` ON `backups` (`deployment_name`,`created_at`);--> statement-breakpoint
CREATE TABLE `deployments` (
	`name` text PRIMARY KEY NOT NULL,
	`type` text,
	`username` text NOT NULL,
	`port` integer,
	`container_id` text,
	`container_name` text,
	`directory` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_deployments_username` ON `deployments` (`username`);--> statement-breakpoint
CREATE TABLE `history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deployment_name` text NOT NULL,
	`action` text NOT NULL,
	`username` text,
	`type` text,
	`port` integer,
	`container_id` text,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_history_deployment` ON `history` (`deployment_name`);--> statement-breakpoint
CREATE TABLE `request_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deployment_name` text NOT NULL,
	`method` text NOT NULL,
	`path` text NOT NULL,
	`status` integer NOT NULL,
	`duration` integer NOT NULL,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_request_logs_deployment` ON `request_logs` (`deployment_name`);--> statement-breakpoint
CREATE INDEX `idx_request_logs_timestamp` ON `request_logs` (`deployment_name`,`timestamp`);--> statement-breakpoint
CREATE TABLE `resource_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deployment_name` text NOT NULL,
	`cpu_percent` real NOT NULL,
	`mem_usage_bytes` integer NOT NULL,
	`mem_limit_bytes` integer NOT NULL,
	`mem_percent` real NOT NULL,
	`net_rx_bytes` integer NOT NULL,
	`net_tx_bytes` integer NOT NULL,
	`block_read_bytes` integer NOT NULL,
	`block_write_bytes` integer NOT NULL,
	`pids` integer NOT NULL,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_resource_metrics_deployment` ON `resource_metrics` (`deployment_name`);--> statement-breakpoint
CREATE INDEX `idx_resource_metrics_timestamp` ON `resource_metrics` (`deployment_name`,`timestamp`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`token` text NOT NULL,
	`label` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_username` ON `sessions` (`username`);--> statement-breakpoint
CREATE INDEX `idx_sessions_token` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `users` (
	`username` text PRIMARY KEY NOT NULL,
	`password` text NOT NULL,
	`created_at` text NOT NULL
);
