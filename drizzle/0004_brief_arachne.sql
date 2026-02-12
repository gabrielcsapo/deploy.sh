ALTER TABLE `request_logs` ADD `ip` text;--> statement-breakpoint
ALTER TABLE `request_logs` ADD `user_agent` text;--> statement-breakpoint
ALTER TABLE `request_logs` ADD `referrer` text;--> statement-breakpoint
ALTER TABLE `request_logs` ADD `request_size` integer;--> statement-breakpoint
ALTER TABLE `request_logs` ADD `response_size` integer;--> statement-breakpoint
ALTER TABLE `request_logs` ADD `query_params` text;--> statement-breakpoint
ALTER TABLE `request_logs` ADD `username` text;