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
  "Connect Live API",
  "trustpass-live-api-base-url",
  "buildConfiguredApiBaseUrl",
  "/api/health",
  "/api/readiness",
  "/api/trustpass",
  "/api/operational-proof",
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

async function fetchText(url, expectedStatuses = [200]) {
  const response = await fetch(url, { cache: "no-store" });
  const text = await response.text();
  assert(
    expectedStatuses.includes(response.status),
    `${url} returned ${response.status}; expected ${expectedStatuses.join(", ")}. Body: ${text.slice(0, 250)}`,
  );
  return { response, text };
}

async function fetchJson(url, expectedStatuses = [200]) {
  const result = await fetchText(url, expectedStatuses);
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

const proof = {
  publicGatewayUrl,
  expectedLiveBaseUrl,
  startedAt: new Date().toISOString(),
  checks: [],
};

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
}

proof.completedAt = new Date().toISOString();
proof.status = "passed";

if (proofOutputPath) {
  await mkdir(path.dirname(path.resolve(proofOutputPath)), { recursive: true });
  await writeFile(proofOutputPath, `${JSON.stringify(proof, null, 2)}\n`);
}

console.log(`TRUSTPASS_PUBLIC_GATEWAY_OK ${JSON.stringify(proof)}`);
