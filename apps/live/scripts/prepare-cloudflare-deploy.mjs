#!/usr/bin/env node

import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, "..");
const configPath = path.join(appDir, "dist", "server", "wrangler.json");
const sourceMigrationsDir = path.join(appDir, "drizzle");
const deployMigrationsDir = path.join(appDir, "dist", "server", "drizzle");

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function readEnv(name, fallback) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

const workerName = readEnv("TRUSTPASS_WORKER_NAME", "trustpass-live");
const d1DatabaseName = readEnv("TRUSTPASS_D1_DATABASE_NAME", "trustpass-live");
const d1DatabaseId = readRequiredEnv("TRUSTPASS_D1_DATABASE_ID");

if (d1DatabaseId === "00000000-0000-4000-8000-000000000000") {
  throw new Error("TRUSTPASS_D1_DATABASE_ID must be a real Cloudflare D1 database ID");
}

const sqlMigrations = (await readdir(sourceMigrationsDir))
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();

if (sqlMigrations.length === 0) {
  throw new Error(`No SQL migrations found in ${sourceMigrationsDir}`);
}

await rm(deployMigrationsDir, { recursive: true, force: true });
await mkdir(deployMigrationsDir, { recursive: true });

for (const fileName of sqlMigrations) {
  await copyFile(path.join(sourceMigrationsDir, fileName), path.join(deployMigrationsDir, fileName));
}

const config = JSON.parse(await readFile(configPath, "utf8"));

config.name = workerName;
config.topLevelName = workerName;
config.assets = {
  ...(config.assets ?? {}),
  directory: "../client",
  binding: "ASSETS",
};
config.d1_databases = [
  {
    binding: "DB",
    database_name: d1DatabaseName,
    database_id: d1DatabaseId,
    migrations_dir: "drizzle",
  },
];

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      workerName,
      d1DatabaseName,
      configPath: path.relative(appDir, configPath),
      migrations: sqlMigrations,
    },
    null,
    2,
  ),
);
