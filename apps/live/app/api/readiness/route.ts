import { env } from "cloudflare:workers";

type D1Result<T> = { results?: T[] };
type D1PreparedStatement = {
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
};
type TrustpassD1Database = {
  prepare(query: string): D1PreparedStatement;
};
type LiveEnv = {
  DB?: TrustpassD1Database;
};

const requiredTables = [
  "organizations",
  "documents",
  "buyer_requests",
  "verification_decisions",
  "audit_events",
  "request_logs",
];

function responseInit(requestId: string, status = 200): ResponseInit {
  return {
    status,
    headers: {
      "cache-control": "no-store",
      "x-request-id": requestId,
    },
  };
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const db = (env as LiveEnv).DB;

  if (!db) {
    return Response.json(
      {
        status: "not_ready",
        d1_connected: false,
        demo_data_enabled: false,
        missing_tables: requiredTables,
        request_id: requestId,
      },
      responseInit(requestId, 503),
    );
  }

  try {
    const tables = await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all<{ name: string }>();
    const present = new Set((tables.results ?? []).map((table) => table.name));
    const missing = requiredTables.filter((table) => !present.has(table));
    const ready = missing.length === 0;

    return Response.json(
      {
        status: ready ? "ready" : "not_ready",
        d1_connected: true,
        demo_data_enabled: false,
        required_tables: requiredTables,
        missing_tables: missing,
        request_id: requestId,
      },
      responseInit(requestId, ready ? 200 : 503),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected readiness error";
    return Response.json(
      {
        status: "not_ready",
        d1_connected: false,
        demo_data_enabled: false,
        error: message,
        request_id: requestId,
      },
      responseInit(requestId, 503),
    );
  }
}
