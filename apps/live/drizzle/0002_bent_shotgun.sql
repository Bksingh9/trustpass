CREATE INDEX IF NOT EXISTS `idx_audit_created` ON `audit_events` (`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_requests_vendor_created` ON `buyer_requests` (`vendor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_documents_org_created` ON `documents` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_org_type_created` ON `organizations` (`type`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_request_logs_created` ON `request_logs` (`created_at`);
