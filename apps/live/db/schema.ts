import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    category: text("category").notNull().default(""),
    location: text("location").notNull().default(""),
    contactEmail: text("contact_email").notNull().default(""),
    status: text("status").notNull().default("active"),
    trustScore: integer("trust_score").notNull().default(0),
    verificationStatus: text("verification_status").notNull().default("draft"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_org_type_created").on(table.type, table.createdAt)],
);

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    documentName: text("document_name").notNull(),
    status: text("status").notNull().default("submitted"),
    expiryDate: text("expiry_date").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_documents_org_created").on(table.organizationId, table.createdAt)],
);

export const buyerRequests = sqliteTable(
  "buyer_requests",
  {
    id: text("id").primaryKey(),
    buyerName: text("buyer_name").notNull(),
    vendorId: text("vendor_id").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull().default(""),
    status: text("status").notNull().default("open"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_requests_vendor_created").on(table.vendorId, table.createdAt)],
);

export const verificationDecisions = sqliteTable("verification_decisions", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull(),
  status: text("status").notNull(),
  trustScore: integer("trust_score").notNull().default(0),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull().default(""),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    summary: text("summary").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_audit_created").on(table.createdAt)],
);

export const requestLogs = sqliteTable(
  "request_logs",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    status: integer("status").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_request_logs_created").on(table.createdAt)],
);
