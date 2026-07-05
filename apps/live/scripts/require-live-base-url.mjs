#!/usr/bin/env node

const value = process.env.TRUSTPASS_LIVE_BASE_URL?.trim() ?? "";

function fail(message) {
  console.error(`TRUSTPASS_LIVE_BASE_URL_REQUIRED ${message}`);
  process.exit(1);
}

if (!value) {
  fail(
    "Set the repository variable TRUSTPASS_LIVE_BASE_URL to the deployed Cloudflare Worker URL before claiming deployed live E2E.",
  );
}

let url;
try {
  url = new URL(value);
} catch {
  fail(`Invalid URL: ${value}`);
}

if (url.protocol !== "https:") {
  fail(`The deployed live API must use https, got ${url.protocol}`);
}

if (url.hostname === "bksingh9.github.io" && url.pathname.startsWith("/trustpass")) {
  fail("GitHub Pages is the static gateway, not the live Worker API.");
}

if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") {
  fail("Localhost cannot prove deployed live E2E.");
}

console.log(
  `TRUSTPASS_LIVE_BASE_URL_OK ${JSON.stringify({
    liveBaseUrl: url.toString().replace(/\/?$/, "/"),
  })}`,
);
