ALTER TABLE `build_logs` ADD `runtime_logs` text;--> statement-breakpoint
ALTER TABLE `deployments` ADD `current_build_log_id` integer;