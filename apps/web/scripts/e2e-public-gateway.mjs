#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const forbiddenSnippets = [
  "Seeded TRUSTPASS demo data",
  "trustpass-demo-state",
  "TRUSTPASS_DEMO_RESET",
  "demo@trustpass.local",
  "/demo/",
  "Atlas Freight Partners",
  "Northstar Digital Studio",
  "Clearpath Advisory",
  "Priya Shah",
  "Acme Procurement",
];

const requiredSnippets = [
  "TRUSTPASS Live Gateway",
  'name="trustpass-build-sha"',
  "Connect Live API",
  "trustpass-live-api-base-url",
  "buildConfiguredApiBaseUrl",
  "/api/health",
  "/api/readiness",
  "/api/trustpass",
  "/api/operational-proof",
  "Create Vendor",
  "Create Buyer",
  "Add Document Metadata",
  "Create Buyer Request",
  "Record Verification Decision",
  'name="document_name"',
  'postTrustpass("decide_verification"',
  "Request Logs",
  "Audit Events",
  "Trust Score History",
  "Notifications",
];

const publicGatewayUrl = normalizeUrl(
  process.env.TRUSTPASS_PUBLIC_GATEWAY_URL || "https://bksingh9.github.io/trustpass/",
);
const expectedLiveBaseUrl = process.env.TRUSTPASS_LIVE_BASE_URL
  ? normalizeUrl(process.env.TRUSTPASS_LIVE_BASE_URL)
  : "";
const proofOutputPath = process.env.TRUSTPASS_PUBLIC_GATEWAY_PROOF_PATH || "";
const skipLiveApiChecks = process.env.TRUSTPASS_PUBLIC_GATEWAY_SKIP_LIVE_API === "1";
const skipWriteProof = process.env.TRUSTPASS_PUBLIC_GATEWAY_SKIP_WRITE_PROOF === "1";
const attempts = Number(process.env.TRUSTPASS_PUBLIC_GATEWAY_ATTEMPTS || 30);
const delayMs = Number(process.env.TRUSTPASS_PUBLIC_GATEWAY_DELAY_MS || 3000);
const expectedPagesApiHealthStatus = Number(process.env.TRUSTPASS_PUBLIC_GATEWAY_API_HEALTH_STATUS || 404);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeUrl(value) {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/?$/, "/");
  return url.toString();
}

function urlFor(baseUrl, routePath) {
  return new URL(routePath.replace(/^\/+/, ""), baseUrl);
}

async function delay() {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function fetchText(url, expectedStatuses = [200], options = {}) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const text = await response.text();
  assert(
    expectedStatuses.includes(response.status),
    `${url} returned ${response.status}; expected ${expectedStatuses.join(", ")}. Body: ${text.slice(0, 250)}`,
  );
  return { response, text };
}

async function fetchJson(url, expectedStatuses = [200], options = {}) {
  const result = await fetchText(url, expectedStatuses, options);
  let body;
  try {
    body = JSON.parse(result.text);
  } catch {
    throw new Error(`${url} did not return JSON: ${result.text.slice(0, 250)}`);
  }
  return { ...result, body };
}

async function retry(fn, label) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await delay();
      }
    }
  }
  throw new Error(`${label} did not pass after ${attempts} attempts: ${lastError?.message ?? "unknown error"}`);
}

function assertGatewayHtml(text, label) {
  for (const snippet of requiredSnippets) {
    assert(text.includes(snippet), `${label} missing required content: ${snippet}`);
  }

  for (const snippet of forbiddenSnippets) {
    assert(!text.includes(snippet), `${label} contains forbidden content: ${snippet}`);
  }

  if (expectedLiveBaseUrl) {
    const expectedLiteral = JSON.stringify(expectedLiveBaseUrl.replace(/\/$/, ""));
    assert(text.includes(expectedLiteral), `${label} is not preconnected to ${expectedLiveBaseUrl}`);
  }
}

function findByName(rows, name) {
  return rows.find((row) => row.name === name);
}

function assertRequestId(result, requestId, label) {
  const headerRequestId = result.response.headers.get("x-request-id");
  assert(headerRequestId === requestId, `${label} x-request-id mismatch: expected ${requestId}, got ${headerRequestId}`);
  assert(result.body?.request_id === requestId, `${label} response body request_id mismatch`);
}

const proof = {
  publicGatewayUrl,
  expectedLiveBaseUrl,
  startedAt: new Date().toISOString(),
  checks: [],
};

async function postTrustpassAction(action, payload, requestId) {
  const result = await fetchJson(
    urlFor(expectedLiveBaseUrl, "api/trustpass"),
    [201],
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: new URL(publicGatewayUrl).origin,
        "x-request-id": requestId,
      },
      body: JSON.stringify({ action, ...payload }),
    },
  );
  assertRequestId(result, requestId, action);
  assert(result.body?.data, `${action} response is missing live state data`);
  assert(
    result.body.data.request_logs.some((log) => log.request_id === requestId && log.status === 201),
    `${action} did not persist a request log`,
  );
  assert(
    result.body.data.audit_events.some((event) => event.request_id === requestId),
    `${action} did not persist an audit event`,
  );
  return result.body.data;
}

const root = await retry(async () => {
  const result = await fetchText(publicGatewayUrl);
  assertGatewayHtml(result.text, "public gateway root");
  return result;
}, "public gateway root");
proof.checks.push("public_gateway_root");
proof.root = {
  status: root.response.status,
  bytes: root.text.length,
};

const fallback = await fetchText(urlFor(publicGatewayUrl, "unknown/path"), [200, 404]);
assertGatewayHtml(fallback.text, "public gateway fallback");
proof.checks.push("public_gateway_fallback");
proof.fallback = {
  status: fallback.response.status,
  bytes: fallback.text.length,
};

const pagesApiHealth = await fetchText(urlFor(publicGatewayUrl, "api/health"), [expectedPagesApiHealthStatus]);
assertGatewayHtml(pagesApiHealth.text, "public gateway API fallback");
proof.checks.push("pages_api_health_is_static_fallback");
proof.pagesApiHealth = {
  status: pagesApiHealth.response.status,
};

if (expectedLiveBaseUrl && !skipLiveApiChecks) {
  const preflight = await fetchText(
    urlFor(expectedLiveBaseUrl, "api/trustpass"),
    [204],
    {
      method: "OPTIONS",
      headers: {
        origin: new URL(publicGatewayUrl).origin,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type,x-request-id",
      },
    },
  );
  assert(preflight.response.headers.get("access-control-allow-origin") === "*", "live API preflight is missing CORS");
  assert(
    preflight.response.headers.get("access-control-allow-methods")?.includes("POST"),
    "live API preflight does not allow POST",
  );
  proof.checks.push("live_cors_preflight");
  proof.preflight = {
    status: preflight.response.status,
  };

  const liveHealth = await fetchJson(urlFor(expectedLiveBaseUrl, "api/health"));
  assert(liveHealth.body?.service === "trustpass-live", "live API health did not identify trustpass-live");
  assert(liveHealth.body?.demo_data_enabled === false, "live API health reports demo data enabled");
  proof.checks.push("live_api_health");
  proof.liveHealth = {
    status: liveHealth.response.status,
    requestId: liveHealth.response.headers.get("x-request-id"),
    service: liveHealth.body.service,
    demoDataEnabled: liveHealth.body.demo_data_enabled,
  };

  const liveReadiness = await fetchJson(urlFor(expectedLiveBaseUrl, "api/readiness"));
  assert(liveReadiness.body?.status === "ready", `live API readiness status is ${liveReadiness.body?.status}`);
  assert(liveReadiness.body?.d1_connected === true, "live API readiness does not see D1");
  assert(
    Array.isArray(liveReadiness.body?.missing_tables) && liveReadiness.body.missing_tables.length === 0,
    "live API readiness has missing tables",
  );
  proof.checks.push("live_api_readiness");
  proof.liveReadiness = {
    status: liveReadiness.response.status,
    requestId: liveReadiness.response.headers.get("x-request-id"),
    readiness: liveReadiness.body.status,
    d1Connected: liveReadiness.body.d1_connected,
    missingTables: liveReadiness.body.missing_tables,
  };

  const operationalProof = await fetchJson(urlFor(expectedLiveBaseUrl, "api/operational-proof"));
  assert(operationalProof.body?.service === "trustpass-live", "operational proof did not identify trustpass-live");
  assert(operationalProof.body?.runtime === "sites-worker-d1", "operational proof did not identify Worker/D1");
  assert(operationalProof.body?.d1_connected === true, "operational proof does not see D1");
  assert(operationalProof.body?.demo_data_enabled === false, "operational proof reports demo data enabled");
  assert(
    Array.isArray(operationalProof.body?.missing_tables) && operationalProof.body.missing_tables.length === 0,
    "operational proof has missing tables",
  );
  proof.checks.push("live_operational_proof");
  proof.operationalProof = {
    status: operationalProof.response.status,
    requestId: operationalProof.response.headers.get("x-request-id"),
    counts: operationalProof.body.counts,
    invariants: operationalProof.body.invariants,
  };

  if (!skipWriteProof) {
    const runId = `public-gateway-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const vendorName = `TRUSTPASS Public Vendor ${runId}`;
    const buyerName = `TRUSTPASS Public Buyer ${runId}`;
    const documentName = `Public compliance packet ${runId}`;
    const requestSubject = `Public gateway request ${runId}`;
    const requestIds = {
      vendor: `${runId}-vendor`,
      buyer: `${runId}-buyer`,
      document: `${runId}-document`,
      request: `${runId}-request`,
      decision: `${runId}-decision`,
      finalRead: `${runId}-final-read`,
      finalProof: `${runId}-final-proof`,
    };

    let state = await postTrustpassAction(
      "create_vendor",
      {
        name: vendorName,
        category: "Public gateway proof",
        location: "GitHub Pages",
        contact_email: `${runId}@trustpass.example`,
      },
      requestIds.vendor,
    );
    const vendor = findByName(state.vendors, vendorName);
    assert(vendor, "public write proof created vendor was not returned");

    state = await postTrustpassAction(
      "create_buyer",
      {
        name: buyerName,
        category: "Procurement",
        location: "GitHub Pages",
        contact_email: `${runId}-buyer@trustpass.example`,
      },
      requestIds.buyer,
    );
    const buyer = findByName(state.buyers, buyerName);
    assert(buyer, "public write proof created buyer was not returned");

    state = await postTrustpassAction(
      "add_document",
      {
        vendor_id: vendor.id,
        document_name: documentName,
        status: "submitted",
        expiry_date: "2027-07-05",
      },
      requestIds.document,
    );
    assert(
      state.documents.some((document) => document.document_name === documentName && document.organization_id === vendor.id),
      "public write proof document was not persisted",
    );

    state = await postTrustpassAction(
      "create_buyer_request",
      {
        buyer_id: buyer.id,
        vendor_id: vendor.id,
        subject: requestSubject,
        message: "Public gateway live write proof.",
      },
      requestIds.request,
    );
    const buyerRequest = state.buyer_requests.find((request) => request.subject === requestSubject);
    assert(buyerRequest, "public write proof buyer request was not returned");
    assert(buyerRequest.buyer_id === buyer.id, "public write proof buyer request is not linked to the buyer");
    assert(
      state.notifications.some(
        (notification) => notification.request_id === requestIds.request && notification.type === "buyer_request",
      ),
      "public write proof buyer request notification was not persisted",
    );

    state = await postTrustpassAction(
      "decide_verification",
      {
        vendor_id: vendor.id,
        status: "approved",
        trust_score: 91,
        notes: `Approved through public gateway proof ${runId}`,
      },
      requestIds.decision,
    );
    const updatedVendor = state.vendors.find((row) => row.id === vendor.id);
    assert(updatedVendor?.verification_status === "approved", "public write proof vendor status was not updated");
    assert(updatedVendor?.trust_score === 91, "public write proof vendor score was not updated");
    assert(
      state.trust_score_snapshots.some(
        (snapshot) =>
          snapshot.vendor_id === vendor.id &&
          snapshot.score === 91 &&
          snapshot.evidence_request_id === requestIds.decision,
      ),
      "public write proof trust score snapshot was not persisted",
    );
    assert(
      state.notifications.some(
        (notification) =>
          notification.request_id === requestIds.decision && notification.type === "verification_decision",
      ),
      "public write proof verification notification was not persisted",
    );

    const finalState = await fetchJson(
      urlFor(expectedLiveBaseUrl, "api/trustpass"),
      [200],
      {
        headers: {
          "x-request-id": requestIds.finalRead,
        },
      },
    );
    assertRequestId(finalState, requestIds.finalRead, "public write final read");
    assert(finalState.body.data.vendors.some((row) => row.id === vendor.id), "final read lost public proof vendor");
    assert(finalState.body.data.buyers.some((row) => row.id === buyer.id), "final read lost public proof buyer");
    assert(
      finalState.body.data.documents.some((document) => document.document_name === documentName),
      "final read lost public proof document",
    );
    assert(
      finalState.body.data.buyer_requests.some((request) => request.subject === requestSubject),
      "final read lost public proof buyer request",
    );
    assert(
      finalState.body.data.audit_events.some((event) => event.request_id === requestIds.decision),
      "final read lost public proof decision audit event",
    );
    assert(
      finalState.body.data.request_logs.some((log) => log.request_id === requestIds.finalRead),
      "final read did not log the public proof read",
    );

    const finalOperationalProof = await fetchJson(
      urlFor(expectedLiveBaseUrl, "api/operational-proof"),
      [200],
      {
        headers: {
          "x-request-id": requestIds.finalProof,
        },
      },
    );
    assertRequestId(finalOperationalProof, requestIds.finalProof, "public write final operational proof");
    assert(finalOperationalProof.body?.invariants?.has_request_logs === true, "final proof has no request logs");
    assert(finalOperationalProof.body?.invariants?.has_audit_events === true, "final proof has no audit events");
    assert(finalOperationalProof.body?.invariants?.has_score_snapshots === true, "final proof has no score snapshots");
    assert(finalOperationalProof.body?.invariants?.has_notifications === true, "final proof has no notifications");

    proof.checks.push("public_gateway_live_write_proof");
    proof.publicGatewayWriteProof = {
      runId,
      requestIds,
      vendor: { id: vendor.id, name: vendorName },
      buyer: { id: buyer.id, name: buyerName },
      document: { name: documentName },
      buyerRequest: { subject: requestSubject, buyerId: buyer.id, vendorId: vendor.id },
      decision: { vendorId: vendor.id, status: updatedVendor.verification_status, trustScore: updatedVendor.trust_score },
      finalCounts: {
        vendors: finalState.body.data.vendors.length,
        buyers: finalState.body.data.buyers.length,
        documents: finalState.body.data.documents.length,
        buyerRequests: finalState.body.data.buyer_requests.length,
        trustScoreSnapshots: finalState.body.data.trust_score_snapshots.length,
        notifications: finalState.body.data.notifications.length,
        auditEvents: finalState.body.data.audit_events.length,
        requestLogs: finalState.body.data.request_logs.length,
      },
      operationalInvariants: finalOperationalProof.body.invariants,
    };
  }
}

proof.completedAt = new Date().toISOString();
proof.status = "passed";

if (proofOutputPath) {
  await mkdir(path.dirname(path.resolve(proofOutputPath)), { recursive: true });
  await writeFile(proofOutputPath, `${JSON.stringify(proof, null, 2)}\n`);
}

console.log(`TRUSTPASS_PUBLIC_GATEWAY_OK ${JSON.stringify(proof)}`);
