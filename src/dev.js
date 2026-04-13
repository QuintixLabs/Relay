/*
  src/dev.js

  Starts the app in local dev mode with simple defaults.
*/

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

loadEnvFile();

process.env.MODE ??= "hub";
process.env.HOST ??= "127.0.0.1";
process.env.PORT ??= "3010";

await import("./server.js");

function loadEnvFile() {
  const envPath = join(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  const raw = readFileSync(envPath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = value;
  }
}
