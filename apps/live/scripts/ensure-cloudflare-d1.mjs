#!/usr/bin/env node

import { appendFile } from "node:fs/promises";

const API_BASE_URL = "https://api.cloudflare.com/client/v4";
const PLACEHOLDER_DATABASE_ID = "00000000-0000-4000-8000-000000000000";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalEnv(name) {
  return process.env[name]?.trim() || "";
}

async function writeGithubValue(name, value) {
  if (process.env.GITHUB_ENV) {
    await appendFile(process.env.GITHUB_ENV, `${name}=${value}\n`);
  }
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${name.toLowerCase()}=${value}\n`);
  }
}

async function cloudflareRequest(path, init = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${requiredEnv("CLOUDFLARE_API_TOKEN")}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success !== true) {
    const message =
      body.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
      body.messages?.map((entry) => entry.message).filter(Boolean).join("; ") ||
      `${path} returned ${response.status}`;
    throw new Error(message);
  }
  return body;
}

async function resolveExistingDatabase(accountId, databaseName) {
  const query = new URLSearchParams({
    name: databaseName,
    page: "1",
    per_page: "100",
  });
  const body = await cloudflareRequest(`/accounts/${accountId}/d1/database?${query.toString()}`);
  return body.result?.find((database) => database.name === databaseName);
}

async function createDatabase(accountId, databaseName) {
  const primaryLocationHint = optionalEnv("TRUSTPASS_D1_PRIMARY_LOCATION_HINT");
  const jurisdiction = optionalEnv("TRUSTPASS_D1_JURISDICTION");
  const payload = {
    name: databaseName,
  };

  if (primaryLocationHint) {
    payload.primary_location_hint = primaryLocationHint;
  }
  if (jurisdiction) {
    payload.jurisdiction = jurisdiction;
  }

  const body = await cloudflareRequest(`/accounts/${accountId}/d1/database`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return body.result;
}

async function main() {
  const databaseName = requiredEnv("TRUSTPASS_D1_DATABASE_NAME");
  const providedDatabaseId = optionalEnv("TRUSTPASS_D1_DATABASE_ID");

  if (providedDatabaseId && providedDatabaseId !== PLACEHOLDER_DATABASE_ID) {
    await writeGithubValue("TRUSTPASS_D1_DATABASE_ID", providedDatabaseId);
    console.log(`Using provided D1 database ID for ${databaseName}.`);
    return;
  }

  const accountId = encodeURIComponent(requiredEnv("CLOUDFLARE_ACCOUNT_ID"));
  const existingDatabase = await resolveExistingDatabase(accountId, databaseName);
  const database = existingDatabase ?? (await createDatabase(accountId, databaseName));
  const databaseId = database?.uuid;

  if (!databaseId) {
    throw new Error(`Could not resolve D1 database ID for ${databaseName}`);
  }

  await writeGithubValue("TRUSTPASS_D1_DATABASE_ID", databaseId);
  console.log(`${existingDatabase ? "Resolved" : "Created"} D1 database ${databaseName}.`);
}

await main();
