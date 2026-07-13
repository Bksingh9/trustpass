import { env } from "cloudflare:workers";

type D1Result<T> = { results?: T[] };
type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<{ success: boolean }>;
};
type TrustpassD1Database = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
};
type LiveEnv = {
  DB?: TrustpassD1Database;
};

const requiredTables = [
  "organizations",
  "documents",
  "buyer_requests",
  "verification_decisions",
  "trust_score_snapshots",
  "notifications",
  "audit_events",
  "request_logs",
];

function responseInit(requestId: string, status = 200): ResponseInit {
  return {
    status,
    headers: {
      "access-control-allow-headers": "content-type,x-request-id",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "x-request-id": requestId,
    },
  };
}

async function ensureSchema(db: TrustpassD1Database) {
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, category TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', contact_email TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', trust_score INTEGER NOT NULL DEFAULT 0, verification_status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, document_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'submitted', expiry_date TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS buyer_requests (id TEXT PRIMARY KEY, buyer_id TEXT NOT NULL DEFAULT '', buyer_name TEXT NOT NULL, vendor_id TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS verification_decisions (id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL, status TEXT NOT NULL, trust_score INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS trust_score_snapshots (id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', buyer_safe_summary TEXT NOT NULL DEFAULT '', evidence_request_id TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'unread', request_id TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, request_id TEXT NOT NULL DEFAULT '', action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS request_logs (id TEXT PRIMARY KEY, request_id TEXT NOT NULL, method TEXT NOT NULL, path TEXT NOT NULL, status INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events (created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_request_logs_created ON request_logs (created_at)"),
  ]);
}

async function recordRequestLog(db: TrustpassD1Database, request: Request, requestId: string, status: number) {
  const path = new URL(request.url).pathname;
  await db
    .prepare("INSERT INTO request_logs (id, request_id, method, path, status) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), requestId, request.method, path, status)
    .run();
}

async function countRows(db: TrustpassD1Database, tableName: string) {
  const rows = await db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).all<{ count: number }>();
  return Number(rows.results?.[0]?.count ?? 0);
}

async function recentRows<T>(db: TrustpassD1Database, query: string) {
  const rows = await db.prepare(query).all<T>();
  return rows.results ?? [];
}

export async function OPTIONS(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  return new Response(null, responseInit(requestId, 204));
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const db = (env as LiveEnv).DB;

  if (!db) {
    return Response.json(
      {
        status: "not_ready",
        service: "trustpass-live",
        runtime: "sites-worker-d1",
        d1_connected: false,
        demo_data_enabled: false,
        missing_tables: requiredTables,
        request_id: requestId,
      },
      responseInit(requestId, 503),
    );
  }

  try {
    await ensureSchema(db);
    await recordRequestLog(db, request, requestId, 200);

    const tableRows = await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all<{ name: string }>();
    const present = new Set((tableRows.results ?? []).map((table) => table.name));
    const missingTables = requiredTables.filter((table) => !present.has(table));
    const counts = Object.fromEntries(
      await Promise.all(requiredTables.map(async (table) => [table, await countRows(db, table)])),
    ) as Record<string, number>;

    const recentAuditEvents = await recentRows<{ summary?: string; [key: string]: unknown }>(
      db,
      "SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 10",
    );
    const recentRequestLogs = await recentRows<{ [key: string]: unknown }>(
      db,
      "SELECT * FROM request_logs ORDER BY created_at DESC LIMIT 10",
    );
    const recentScoreSnapshots = await recentRows<{ reason?: string; [key: string]: unknown }>(
      db,
      "SELECT trust_score_snapshots.*, organizations.name AS vendor_name FROM trust_score_snapshots LEFT JOIN organizations ON organizations.id = trust_score_snapshots.vendor_id ORDER BY trust_score_snapshots.created_at DESC LIMIT 10",
    );
    const recentNotifications = await recentRows<{ body?: string; [key: string]: unknown }>(
      db,
      "SELECT notifications.*, organizations.name AS organization_name FROM notifications LEFT JOIN organizations ON organizations.id = notifications.organization_id ORDER BY notifications.created_at DESC LIMIT 10",
    );

    return Response.json(
      {
        status: missingTables.length === 0 ? "ready" : "not_ready",
        service: "trustpass-live",
        runtime: "sites-worker-d1",
        d1_connected: true,
        demo_data_enabled: false,
        generated_at: new Date().toISOString(),
        request_id: requestId,
        required_tables: requiredTables,
        missing_tables: missingTables,
        counts,
        invariants: {
          has_request_logs: counts.request_logs > 0,
          has_audit_events: counts.audit_events > 0,
          has_score_snapshots: counts.trust_score_snapshots > 0,
          has_notifications: counts.notifications > 0,
        },
         recent: {
           audit_events: recentAuditEvents.map(({ summary: _summary, ...event }) => event),
           request_logs: recentRequestLogs,
           trust_score_snapshots: recentScoreSnapshots.map(({ reason: _reason, ...snapshot }) => snapshot),
           notifications: recentNotifications.map(({ body: _body, ...notification }) => notification),
         },
      },
      responseInit(requestId, missingTables.length === 0 ? 200 : 503),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected operational proof error";
    return Response.json(
      {
        status: "not_ready",
        service: "trustpass-live",
        runtime: "sites-worker-d1",
        d1_connected: false,
        demo_data_enabled: false,
        error: message,
        request_id: requestId,
      },
      responseInit(requestId, 503),
    );
  }
}
