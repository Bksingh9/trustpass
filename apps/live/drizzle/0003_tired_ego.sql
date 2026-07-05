ALTER TABLE `buyer_requests` ADD `buyer_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_requests_buyer_created` ON `buyer_requests` (`buyer_id`,`created_at`);
