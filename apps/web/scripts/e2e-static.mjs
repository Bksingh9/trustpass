import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
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

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  const relativePath = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
  const candidatePath = path.resolve(pagesRoot, relativePath);
  const isInsidePagesRoot = candidatePath === pagesRoot || candidatePath.startsWith(pagesRoot + path.sep);
  const filePath =
    isInsidePagesRoot && existsSync(candidatePath) && statSync(candidatePath).isFile()
      ? candidatePath
      : indexPath;

  response.setHeader("content-type", "text/html; charset=utf-8");
  createReadStream(filePath).pipe(response);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

try {
  const { port } = server.address();
  const baseUrl = "http://127.0.0.1:" + port;
  const paths = ["/", "/index.html", "/404.html", "/unknown/path"];

  for (const routePath of paths) {
    const response = await fetch(baseUrl + routePath);
    const body = await response.text();
    assert(response.status === 200, routePath + " returned " + response.status);
    assert(body.includes("TRUSTPASS Live Gateway"), routePath + " did not render live gateway");
    for (const snippet of forbiddenSnippets) {
      assert(!body.includes(snippet), routePath + " contains forbidden content: " + snippet);
    }
  }
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

console.log("STATIC_E2E_OK");
