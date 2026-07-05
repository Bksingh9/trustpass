#!/usr/bin/env node

import { appendFile, readFile } from "node:fs/promises";

function readEnv(name) {
  return process.env[name]?.trim() || "";
}

function parseArgs() {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 1) {
    const value = process.argv[index];
    if (value.startsWith("--")) {
      args.set(value.slice(2), process.argv[index + 1]);
      index += 1;
    }
  }
  return args;
}

function normalizeUrl(value) {
  const trimmed = String(value || "").trim().replace(/[),.;]+$/, "");
  if (!trimmed) {
    return "";
  }
  const url = new URL(trimmed);
  url.hash = "";
  url.search = "";
  url.pathname = "/";
  return url.toString();
}

function extractUrlFromText(text) {
  const matches = Array.from(text.matchAll(/https?:\/\/[^\s"'<>]+/g), (match) => match[0])
    .map((value) => {
      try {
        return normalizeUrl(value);
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  return matches.find((value) => value.includes(".workers.dev/")) || matches[0] || "";
}

async function writeGithubValue(name, value) {
  if (process.env.GITHUB_ENV) {
    await appendFile(process.env.GITHUB_ENV, `${name}=${value}\n`);
  }
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${name.toLowerCase()}=${value}\n`);
  }
}

async function main() {
  const args = parseArgs();
  const providedUrl = readEnv("TRUSTPASS_LIVE_BASE_URL");
  let resolvedUrl = "";

  if (providedUrl) {
    resolvedUrl = normalizeUrl(providedUrl);
  } else {
    const deployLogPath = args.get("deploy-log") || "deploy-output.log";
    const deployOutput = await readFile(deployLogPath, "utf8");
    resolvedUrl = extractUrlFromText(deployOutput);
  }

  if (!resolvedUrl) {
    throw new Error("Could not resolve deployed Worker URL. Provide live_base_url or check Wrangler deploy output.");
  }

  await writeGithubValue("TRUSTPASS_LIVE_BASE_URL", resolvedUrl);
  console.log(`Resolved TRUSTPASS_LIVE_BASE_URL=${resolvedUrl}`);
}

await main();
