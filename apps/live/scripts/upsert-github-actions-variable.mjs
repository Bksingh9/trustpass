#!/usr/bin/env node

const API_BASE_URL = "https://api.github.com";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function readEnv(name, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function parseRepository(value) {
  const [owner, repo] = value.split("/");
  if (!owner || !repo || value.split("/").length !== 2) {
    throw new Error("GITHUB_REPOSITORY must use owner/repo format");
  }
  return { owner, repo };
}

function validateVariableName(name) {
  if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
    throw new Error("GitHub Actions variable names must use uppercase letters, numbers, and underscores");
  }
  if (name.startsWith("GITHUB_")) {
    throw new Error("GitHub Actions variable names cannot start with GITHUB_");
  }
}

async function githubRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${requiredEnv("GITHUB_TOKEN")}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

function summarizeError(body, fallback) {
  if (!body) {
    return fallback;
  }
  if (body.message) {
    return body.message;
  }
  if (Array.isArray(body.errors)) {
    return body.errors.map((error) => error.message || error.code).filter(Boolean).join("; ");
  }
  return fallback;
}

async function main() {
  const { owner, repo } = parseRepository(requiredEnv("GITHUB_REPOSITORY"));
  const name = readEnv("TRUSTPASS_VARIABLE_NAME", "TRUSTPASS_LIVE_BASE_URL");
  const value = readEnv("TRUSTPASS_VARIABLE_VALUE") || requiredEnv("TRUSTPASS_LIVE_BASE_URL");

  validateVariableName(name);

  if (process.env.TRUSTPASS_VARIABLE_DRY_RUN === "1") {
    console.log(`DRY_RUN would upsert ${name} for ${owner}/${repo}.`);
    return;
  }

  const encodedName = encodeURIComponent(name);
  const variablePath = `/repos/${owner}/${repo}/actions/variables/${encodedName}`;
  const current = await githubRequest(variablePath);

  if (current.response.status === 404) {
    const created = await githubRequest(`/repos/${owner}/${repo}/actions/variables`, {
      method: "POST",
      body: JSON.stringify({ name, value }),
    });
    if (created.response.status !== 201) {
      throw new Error(summarizeError(created.body, `Create variable returned ${created.response.status}`));
    }
    console.log(`Created GitHub Actions variable ${name}.`);
    return;
  }

  if (!current.response.ok) {
    throw new Error(summarizeError(current.body, `Read variable returned ${current.response.status}`));
  }

  const updated = await githubRequest(variablePath, {
    method: "PATCH",
    body: JSON.stringify({ name, value }),
  });

  if (updated.response.status !== 204) {
    throw new Error(summarizeError(updated.body, `Update variable returned ${updated.response.status}`));
  }

  console.log(`Updated GitHub Actions variable ${name}.`);
}

await main();
