import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const pagesRoot = path.join(webRoot, "pages");

await import("./build-pages.mjs");

const indexPath = path.join(pagesRoot, "index.html");
const notFoundPath = path.join(pagesRoot, "404.html");
const indexHtml = readFileSync(indexPath, "utf8");
const notFoundHtml = readFileSync(notFoundPath, "utf8");

const requiredSnippets = [
  "<title>TRUSTPASS</title>",
  'name="trustpass-build-sha"',
  "TRUSTPASS Live Gateway",
  "Connect Live API",
  "trustpass-live-api-base-url",
  "trustpass-live-admin-context",
  "trustpass-live-auth-context",
  "buildConfiguredApiBaseUrl",
  "Supabase account",
  'id="auth-form"',
  "authenticate",
  "/orgs/",
  "Create account",
  "Your workspace",
  "Vendor workspace",
  "Buyer workspace",
  "/vendors/dashboard",
  "/documents/upload",
  "/buyers/search",
  "/buyers/shortlists",
  "/buyers/requests",
  "/billing/checkout",
  "/notifications/",
  "Admin Write Access",
  "Writes require an authorized TRUSTPASS admin context.",
  "Data classification",
  "Customer data assessment",
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
  "Vendor Trust Profiles",
  "Request Logs",
  "Audit Events",
  "Trust Score History",
  "Notifications",
  "addEventListener(\"hashchange\", render)",
];

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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const scriptStart = indexHtml.indexOf("<script>");
const scriptEnd = indexHtml.indexOf("</script>", scriptStart);
assert(scriptStart >= 0 && scriptEnd > scriptStart, "Static artifact is missing its browser script");
try {
  new Function(indexHtml.slice(scriptStart + "<script>".length, scriptEnd));
} catch (error) {
  throw new Error("Generated Pages browser script is invalid: " + error.message);
}

for (const snippet of requiredSnippets) {
  assert(indexHtml.includes(snippet), "Missing static content: " + snippet);
}

for (const snippet of forbiddenSnippets) {
  assert(!indexHtml.includes(snippet), "Static artifact still contains forbidden content: " + snippet);
}

if (process.env.TRUSTPASS_LIVE_BASE_URL) {
  const expectedLiveUrl = process.env.TRUSTPASS_LIVE_BASE_URL.replace(/\/$/, "");
  assert(indexHtml.includes(JSON.stringify(expectedLiveUrl)), "Static artifact is missing configured live API URL");
}

assert(notFoundHtml === indexHtml, "404.html must match index.html for SPA fallback");

const spaPaths = ["/", "/index.html", "/404.html", "/unknown/path", "/workspace"];
for (const routePath of spaPaths) {
  assert(indexHtml.includes("TRUSTPASS Live Gateway"), routePath + " did not render live gateway");
  assert(notFoundHtml === indexHtml, routePath + " fallback artifact is not identical to index artifact");
  for (const snippet of forbiddenSnippets) {
    assert(!indexHtml.includes(snippet), routePath + " contains forbidden content: " + snippet);
  }
}

console.log("STATIC_E2E_OK");
