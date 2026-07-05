#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (value === "--") {
    continue;
  }
  if (value.startsWith("--")) {
    args.set(value.slice(2), process.argv[index + 1]);
    index += 1;
  }
}

const baseUrl = (args.get("base-url") ?? process.env.TRUSTPASS_LIVE_BASE_URL ?? "http://localhost:4175/").replace(
  /\/?$/,
  "/",
);
const proofOutputPath = args.get("proof-out") ?? process.env.TRUSTPASS_LIVE_PROOF_PATH ?? "";
const runId = `live-e2e-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;

function urlFor(path) {
  return new URL(path.replace(/^\/+/, ""), baseUrl);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}, expectedStatuses = [200]) {
  const response = await fetch(urlFor(path), {
    ...options,
    headers: {
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  assert(
    expectedStatuses.includes(response.status),
    `${path} returned ${response.status}; expected ${expectedStatuses.join(", ")}. Body: ${text.slice(0, 250)}`,
  );
  return { response, body, text };
}

async function retry(fn, label, attempts = 30) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`${label} did not become ready: ${lastError?.message ?? "unknown error"}`);
}

function assertRequestId(result, expectedRequestId) {
  const headerRequestId = result.response.headers.get("x-request-id");
  assert(headerRequestId, "response is missing x-request-id header");
  if (expectedRequestId) {
    assert(
      headerRequestId === expectedRequestId,
      `x-request-id mismatch: expected ${expectedRequestId}, got ${headerRequestId}`,
    );
  }
}

function assertNoStaticDemo(text, label) {
  const forbidden = ["Seeded TRUSTPASS demo data", "trustpass.local", "Atlas Freight Partners", "Northstar", "Clearpath"];
  for (const token of forbidden) {
    assert(!text.includes(token), `${label} contains static/demo token: ${token}`);
  }
}

function findByName(rows, name) {
  return rows.find((row) => row.name === name);
}

async function postAction(action, payload, requestId) {
  const result = await request(
    "api/trustpass",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId,
      },
      body: JSON.stringify({ action, ...payload }),
    },
    [201],
  );
  assertRequestId(result, requestId);
  assert(result.response.headers.get("cache-control")?.includes("no-store"), "mutation response is cacheable");
  assert(result.body?.request_id === requestId, "response body request_id does not match header");
  assert(result.body?.data, "mutation response is missing data");
  assert(
    result.body.data.request_logs.some((log) => log.request_id === requestId && log.status === 201),
    `request log missing for ${requestId}`,
  );
  assert(
    result.body.data.audit_events.some((event) => event.request_id === requestId),
    `audit event missing for ${requestId}`,
  );
  summary.requestIds[action] = requestId;
  return result.body.data;
}

const summary = {
  baseUrl,
  runId,
  startedAt: new Date().toISOString(),
  checks: [],
  requestIds: {},
  entities: {},
  evidence: {},
};

const health = await retry(async () => request("api/health"), "TRUSTPASS live health");
assertRequestId(health);
assert(health.response.headers.get("access-control-allow-origin") === "*", "health response is missing CORS");
assert(health.body?.service === "trustpass-live", "health did not identify trustpass-live service");
assert(health.body?.runtime === "sites-worker-d1", "health did not identify the Worker/D1 runtime");
assert(health.body?.demo_data_enabled === false, "health reports demo data enabled");
summary.requestIds.health = health.response.headers.get("x-request-id");
summary.evidence.health = {
  service: health.body.service,
  runtime: health.body.runtime,
  demoDataEnabled: health.body.demo_data_enabled,
};
summary.checks.push("health");

if (process.env.TRUSTPASS_REQUIRE_CORS_PREFLIGHT === "1") {
  const preflight = await request(
    "api/trustpass",
    {
      method: "OPTIONS",
      headers: {
        origin: "https://bksingh9.github.io",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type,x-request-id",
      },
    },
    [204],
  );
  assert(preflight.response.headers.get("access-control-allow-origin") === "*", "preflight is missing CORS");
  assert(
    preflight.response.headers.get("access-control-allow-methods")?.includes("POST"),
    "preflight does not allow POST",
  );
  summary.checks.push("cors_preflight");
}

const page = await request("");
assert(page.text.includes("TRUSTPASS Live Operations"), "root page is not the live operations app");
assertNoStaticDemo(page.text, "root page");
summary.checks.push("root_page_no_static_demo");

const initial = await request("api/trustpass");
assertRequestId(initial);
assert(initial.response.headers.get("cache-control")?.includes("no-store"), "state response is cacheable");
assert(initial.body?.data, "state response is missing data");
assertNoStaticDemo(JSON.stringify(initial.body), "state API");
summary.requestIds.initialState = initial.response.headers.get("x-request-id");
summary.checks.push("state_api");

const readiness = await request("api/readiness");
assertRequestId(readiness);
assert(readiness.body?.status === "ready", `readiness status is ${readiness.body?.status}`);
assert(readiness.body?.d1_connected === true, "readiness does not see D1");
assert(readiness.body?.demo_data_enabled === false, "readiness reports demo data enabled");
assert(Array.isArray(readiness.body?.missing_tables) && readiness.body.missing_tables.length === 0, "readiness has missing tables");
summary.requestIds.readiness = readiness.response.headers.get("x-request-id");
summary.evidence.readiness = {
  status: readiness.body.status,
  d1Connected: readiness.body.d1_connected,
  missingTables: readiness.body.missing_tables,
};
summary.checks.push("readiness");

const vendorName = `TRUSTPASS Live Vendor ${runId}`;
const buyerName = `TRUSTPASS Live Buyer ${runId}`;
const documentName = `Compliance packet ${runId}`;
const requestSubject = `Verification evidence ${runId}`;

let state = await postAction(
  "create_vendor",
  {
    name: vendorName,
    category: "Security verification",
    location: "Live QA",
    contact_email: `${runId}@trustpass.example`,
  },
  `${runId}-vendor`,
);
const vendor = findByName(state.vendors, vendorName);
assert(vendor, "created vendor not found in state");
summary.vendorId = vendor.id;
summary.entities.vendor = { id: vendor.id, name: vendorName };
summary.checks.push("create_vendor");

state = await postAction(
  "create_buyer",
  {
    name: buyerName,
    category: "Procurement",
    location: "Live QA",
    contact_email: `${runId}-buyer@trustpass.example`,
  },
  `${runId}-buyer`,
);
const buyer = findByName(state.buyers, buyerName);
assert(buyer, "created buyer not found in state");
summary.entities.buyer = { id: buyer.id, name: buyerName };
summary.checks.push("create_buyer");

state = await postAction(
  "add_document",
  {
    vendor_id: vendor.id,
    document_name: documentName,
    status: "submitted",
    expiry_date: "2027-07-05",
  },
  `${runId}-document`,
);
assert(state.documents.some((document) => document.document_name === documentName), "created document not found in state");
summary.entities.document = { name: documentName };
summary.checks.push("add_document");

state = await postAction(
  "create_buyer_request",
  {
    buyer_id: buyer.id,
    vendor_id: vendor.id,
    subject: requestSubject,
    message: "Please review current buyer-safe verification evidence.",
  },
  `${runId}-request`,
);
const buyerRequest = state.buyer_requests.find((requestRow) => requestRow.subject === requestSubject);
assert(buyerRequest, "buyer request not found in state");
assert(buyerRequest.buyer_id === buyer.id, "buyer request is not linked to created buyer organization");
assert(buyerRequest.buyer_name === buyerName, "buyer request did not expose buyer organization name");
summary.entities.buyerRequest = { buyerId: buyer.id, subject: requestSubject };
summary.checks.push("create_buyer_request");

state = await postAction(
  "decide_verification",
  {
    vendor_id: vendor.id,
    status: "approved",
    trust_score: 94,
    notes: `Approved by ${runId}`,
  },
  `${runId}-decision`,
);
const updatedVendor = state.vendors.find((row) => row.id === vendor.id);
assert(updatedVendor?.verification_status === "approved", "vendor status was not updated to approved");
assert(updatedVendor?.trust_score === 94, "vendor trust score was not updated");
assert(state.verification_decisions.some((decision) => decision.vendor_id === vendor.id || decision.vendor_name === vendorName), "verification decision not found");
summary.entities.verificationDecision = {
  vendorId: vendor.id,
  status: updatedVendor.verification_status,
  trustScore: updatedVendor.trust_score,
};
summary.checks.push("decide_verification");

const finalState = await request("api/trustpass", {
  headers: {
    "x-request-id": `${runId}-final-read`,
  },
});
assertRequestId(finalState, `${runId}-final-read`);
assert(finalState.body.data.vendors.some((row) => row.name === vendorName), "final read lost created vendor");
assert(
  finalState.body.data.audit_events.some((event) => event.request_id === `${runId}-decision`),
  "final read lost decision audit event",
);
assert(
  finalState.body.data.request_logs.some((log) => log.request_id === `${runId}-final-read`),
  "final read did not log itself",
);
summary.requestIds.finalRead = `${runId}-final-read`;
summary.evidence.finalStateCounts = {
  vendors: finalState.body.data.vendors.length,
  buyers: finalState.body.data.buyers.length,
  documents: finalState.body.data.documents.length,
  buyerRequests: finalState.body.data.buyer_requests.length,
  verificationDecisions: finalState.body.data.verification_decisions.length,
  auditEvents: finalState.body.data.audit_events.length,
  requestLogs: finalState.body.data.request_logs.length,
};
summary.checks.push("final_persistence_read");

summary.completedAt = new Date().toISOString();
summary.status = "passed";

if (proofOutputPath) {
  await mkdir(path.dirname(path.resolve(proofOutputPath)), { recursive: true });
  await writeFile(proofOutputPath, `${JSON.stringify(summary, null, 2)}\n`);
}

console.log(`TRUSTPASS_LIVE_E2E_OK ${JSON.stringify(summary)}`);
