import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const pagesRoot = path.join(webRoot, "pages");
const indexPath = path.join(pagesRoot, "index.html");
const port = Number.parseInt(process.env.PORT || "4173", 10);

if (!existsSync(indexPath)) {
  throw new Error("Run `npm run build:pages` before serving Pages locally.");
}

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

server.listen(port, "127.0.0.1", () => {
  console.log(`TRUSTPASS Pages listening on http://127.0.0.1:${port}`);
});
