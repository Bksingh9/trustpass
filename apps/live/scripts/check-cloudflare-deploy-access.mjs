#!/usr/bin/env node

const API_BASE_URL = "https://api.cloudflare.com/client/v4";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function cloudflareRequest(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      authorization: `Bearer ${requiredEnv("CLOUDFLARE_API_TOKEN")}`,
      "content-type": "application/json",
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

async function main() {
  const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID");
  requiredEnv("CLOUDFLARE_API_TOKEN");

  if (process.env.TRUSTPASS_CLOUDFLARE_PREFLIGHT_DRY_RUN === "1") {
    console.log(
      JSON.stringify({
        status: "dry_run",
        checks: ["account_id_present", "api_token_present"],
      }),
    );
    return;
  }

  const token = await cloudflareRequest("/user/tokens/verify");
  const tokenStatus = token.result?.status;
  if (tokenStatus && tokenStatus !== "active") {
    throw new Error(`Cloudflare API token is ${tokenStatus}, expected active`);
  }

  const d1List = await cloudflareRequest(
    `/accounts/${encodeURIComponent(accountId)}/d1/database?page=1&per_page=10`,
  );

  console.log(
    JSON.stringify({
      status: "ok",
      checks: ["token_verified", "account_d1_access_verified"],
      tokenStatus: tokenStatus || "verified",
      visibleD1Databases: Array.isArray(d1List.result) ? d1List.result.length : 0,
    }),
  );
}

await main();
