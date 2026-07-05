import { env } from "cloudflare:workers";

type D1RunResult = { success: boolean };
type D1Result<T> = { results?: T[] };
type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1RunResult>;
};
type TrustpassD1Database = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
};

type LiveEnv = {
  DB?: TrustpassD1Database;
};

type OrganizationRow = {
  id: string;
  name: string;
  type: string;
  category: string;
  location: string;
  contact_email: string;
  status: string;
  trust_score: number;
  verification_status: string;
  created_at: string;
  updated_at: string;
};

type DocumentRow = {
  id: string;
  organization_id: string;
  document_name: string;
  status: string;
  expiry_date: string;
  vendor_name: string;
  created_at: string;
};

type BuyerRequestRow = {
  id: string;
  buyer_id: string;
  buyer_name: string;
  vendor_id: string;
  vendor_name: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

type DecisionRow = {
  id: string;
  vendor_id: string;
  vendor_name: string;
  status: string;
  trust_score: number;
  notes: string;
  created_at: string;
};

type AuditRow = {
  id: string;
  request_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  created_at: string;
};

type RequestLogRow = {
  id: string;
  request_id: string;
  method: string;
  path: string;
  status: number;
  created_at: string;
};

function getDatabase() {
  const db = (env as LiveEnv).DB;
  if (!db) {
    throw new Error("D1 binding DB is unavailable");
  }
  return db;
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
      "CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, request_id TEXT NOT NULL DEFAULT '', action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS request_logs (id TEXT PRIMARY KEY, request_id TEXT NOT NULL, method TEXT NOT NULL, path TEXT NOT NULL, status INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_org_type_created ON organizations (type, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_documents_org_created ON documents (organization_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_requests_vendor_created ON buyer_requests (vendor_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events (created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_request_logs_created ON request_logs (created_at)"),
  ]);
  await db
    .prepare("ALTER TABLE audit_events ADD COLUMN request_id TEXT NOT NULL DEFAULT ''")
    .run()
    .catch(() => undefined);
  await db
    .prepare("ALTER TABLE buyer_requests ADD COLUMN buyer_id TEXT NOT NULL DEFAULT ''")
    .run()
    .catch(() => undefined);
  await db
    .prepare("CREATE INDEX IF NOT EXISTS idx_requests_buyer_created ON buyer_requests (buyer_id, created_at)")
    .run();
}

async function recordAudit(
  db: TrustpassD1Database,
  requestId: string,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
) {
  await db
    .prepare(
      "INSERT INTO audit_events (id, request_id, action, entity_type, entity_id, summary) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(crypto.randomUUID(), requestId, action, entityType, entityId, summary)
    .run();
}

async function recordRequestLog(
  db: TrustpassD1Database,
  request: Request,
  requestId: string,
  status: number,
) {
  const path = new URL(request.url).pathname;
  await db
    .prepare("INSERT INTO request_logs (id, request_id, method, path, status) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), requestId, request.method, path, status)
    .run();
}

function responseInit(requestId: string, status = 200): ResponseInit {
  return {
    status,
    headers: {
      "access-control-allow-headers": "content-type,x-request-id",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "x-request-id": requestId,
    },
  };
}

export async function OPTIONS(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  return new Response(null, responseInit(requestId, 204));
}

async function readState(db: TrustpassD1Database) {
  const vendors = await db
    .prepare("SELECT * FROM organizations WHERE type = 'vendor' ORDER BY created_at DESC LIMIT 50")
    .all<OrganizationRow>();
  const buyers = await db
    .prepare("SELECT * FROM organizations WHERE type = 'buyer' ORDER BY created_at DESC LIMIT 50")
    .all<OrganizationRow>();
  const documents = await db
    .prepare(
      "SELECT documents.*, organizations.name AS vendor_name FROM documents JOIN organizations ON organizations.id = documents.organization_id ORDER BY documents.created_at DESC LIMIT 50",
    )
    .all<DocumentRow>();
  const buyerRequests = await db
    .prepare(
      "SELECT buyer_requests.id, buyer_requests.buyer_id, COALESCE(NULLIF(buyer_org.name, ''), buyer_requests.buyer_name) AS buyer_name, buyer_requests.vendor_id, vendor_org.name AS vendor_name, buyer_requests.subject, buyer_requests.message, buyer_requests.status, buyer_requests.created_at FROM buyer_requests JOIN organizations AS vendor_org ON vendor_org.id = buyer_requests.vendor_id LEFT JOIN organizations AS buyer_org ON buyer_org.id = buyer_requests.buyer_id ORDER BY buyer_requests.created_at DESC LIMIT 50",
    )
    .all<BuyerRequestRow>();
  const decisions = await db
    .prepare(
      "SELECT verification_decisions.*, organizations.name AS vendor_name FROM verification_decisions JOIN organizations ON organizations.id = verification_decisions.vendor_id ORDER BY verification_decisions.created_at DESC LIMIT 50",
    )
    .all<DecisionRow>();
  const audits = await db
    .prepare("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 80")
    .all<AuditRow>();
  const requestLogs = await db
    .prepare("SELECT * FROM request_logs ORDER BY created_at DESC LIMIT 80")
    .all<RequestLogRow>();

  return {
    vendors: vendors.results ?? [],
    buyers: buyers.results ?? [],
    documents: documents.results ?? [],
    buyer_requests: buyerRequests.results ?? [],
    verification_decisions: decisions.results ?? [],
    audit_events: audits.results ?? [],
    request_logs: requestLogs.results ?? [],
  };
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const db = getDatabase();
  await ensureSchema(db);
  await recordRequestLog(db, request, requestId, 200);
  const state = await readState(db);
  return Response.json({ data: state, request_id: requestId }, responseInit(requestId));
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const db = getDatabase();
  await ensureSchema(db);

  const payload = (await request.json()) as Record<string, string | number | undefined>;
  const action = String(payload.action ?? "");
  let status = 201;

  async function fail(message: string) {
    status = 400;
    await recordRequestLog(db, request, requestId, status);
    return Response.json(
      { error: message, request_id: requestId },
      responseInit(requestId, status),
    );
  }

  try {
    if (action === "create_vendor" || action === "create_buyer") {
      const name = String(payload.name ?? "").trim();
      if (!name) return fail("Organization name is required");
      const type = action === "create_vendor" ? "vendor" : "buyer";
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO organizations (id, name, type, category, location, contact_email) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(
          id,
          name,
          type,
          String(payload.category ?? "").trim(),
          String(payload.location ?? "").trim(),
          String(payload.contact_email ?? "").trim(),
        )
        .run();
      await recordAudit(db, requestId, "create", "organization", id, `Created ${type} organization ${name}`);
    } else if (action === "add_document") {
      const vendorId = String(payload.vendor_id ?? "");
      const documentName = String(payload.document_name ?? "").trim();
      if (!vendorId || !documentName) return fail("Vendor and document name are required");
      const vendor = await db
        .prepare("SELECT id, name FROM organizations WHERE id = ? AND type = 'vendor'")
        .bind(vendorId)
        .first<{ id: string; name: string }>();
      if (!vendor) return fail("Vendor not found");
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO documents (id, organization_id, document_name, status, expiry_date) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(
          id,
          vendorId,
          documentName,
          String(payload.status ?? "submitted"),
          String(payload.expiry_date ?? "").trim(),
        )
        .run();
      await recordAudit(db, requestId, "upload", "document", id, `Added ${documentName} for ${vendor.name}`);
    } else if (action === "create_buyer_request") {
      const buyerId = String(payload.buyer_id ?? "").trim();
      const fallbackBuyerName = String(payload.buyer_name ?? "").trim();
      const vendorId = String(payload.vendor_id ?? "");
      const subject = String(payload.subject ?? "").trim();
      if ((!buyerId && !fallbackBuyerName) || !vendorId || !subject) {
        return fail("Buyer, vendor, and subject are required");
      }
      const buyer = buyerId
        ? await db
            .prepare("SELECT id, name FROM organizations WHERE id = ? AND type = 'buyer'")
            .bind(buyerId)
            .first<{ id: string; name: string }>()
        : null;
      if (buyerId && !buyer) return fail("Buyer not found");
      const vendor = await db
        .prepare("SELECT id, name FROM organizations WHERE id = ? AND type = 'vendor'")
        .bind(vendorId)
        .first<{ id: string; name: string }>();
      if (!vendor) return fail("Vendor not found");
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO buyer_requests (id, buyer_id, buyer_name, vendor_id, subject, message) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(id, buyer?.id ?? "", buyer?.name ?? fallbackBuyerName, vendorId, subject, String(payload.message ?? "").trim())
        .run();
      await recordAudit(
        db,
        requestId,
        "request_info",
        "buyer_request",
        id,
        `${buyer?.name ?? fallbackBuyerName} requested info from ${vendor.name}`,
      );
    } else if (action === "decide_verification") {
      const vendorId = String(payload.vendor_id ?? "");
      const decision = String(payload.status ?? "").trim();
      if (!vendorId || !["approved", "rejected", "changes_requested"].includes(decision)) {
        return fail("Vendor and valid decision are required");
      }
      const score = Math.max(0, Math.min(100, Number(payload.trust_score ?? 0)));
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO verification_decisions (id, vendor_id, status, trust_score, notes) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(id, vendorId, decision, score, String(payload.notes ?? "").trim())
        .run();
      await db
        .prepare(
          "UPDATE organizations SET verification_status = ?, trust_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(decision, score, vendorId)
        .run();
      const auditAction = decision === "approved" ? "approve" : decision === "rejected" ? "reject" : "request_changes";
      await recordAudit(db, requestId, auditAction, "verification_decision", id, `Verification marked ${decision}`);
    } else {
      return fail("Unsupported action");
    }

    await recordRequestLog(db, request, requestId, status);
    const state = await readState(db);
    return Response.json(
      { data: state, request_id: requestId },
      responseInit(requestId, status),
    );
  } catch (error) {
    status = 500;
    await recordRequestLog(db, request, requestId, status);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json(
      { error: message, request_id: requestId },
      responseInit(requestId, status),
    );
  }
}
