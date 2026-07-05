CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'unread' NOT NULL,
	`request_id` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_org_created` ON `notifications` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_notifications_status_created` ON `notifications` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `trust_score_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_id` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`buyer_safe_summary` text DEFAULT '' NOT NULL,
	`evidence_request_id` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_score_snapshots_vendor_created` ON `trust_score_snapshots` (`vendor_id`,`created_at`);