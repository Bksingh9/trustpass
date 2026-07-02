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
  "Vendor trust workspace",
  "Verified vendor search",
  "Verification review queue",
  "Vendor Basic",
  "Request a demo",
  "demo@trustpass.local",
  "Atlas Freight Partners",
  "Northstar Digital Studio",
  "Clearpath Advisory",
  "addEventListener(\"hashchange\", render)",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const snippet of requiredSnippets) {
  assert(indexHtml.includes(snippet), `Missing static content: ${snippet}`);
}

assert(notFoundHtml === indexHtml, "404.html must match index.html for SPA fallback");

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  const relativePath = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
  const candidatePath = path.resolve(pagesRoot, relativePath);
  const isInsidePagesRoot = candidatePath === pagesRoot || candidatePath.startsWith(`${pagesRoot}${path.sep}`);
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
  const baseUrl = `http://127.0.0.1:${port}`;
  const paths = ["/", "/index.html", "/404.html", "/unknown/path"];

  for (const routePath of paths) {
    const response = await fetch(`${baseUrl}${routePath}`);
    const body = await response.text();
    assert(response.status === 200, `${routePath} returned ${response.status}`);
    assert(body.includes("TRUSTPASS"), `${routePath} did not render TRUSTPASS`);
    assert(body.includes("Atlas Freight Partners"), `${routePath} did not include seeded vendors`);
  }
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

console.log("STATIC_E2E_OK");
