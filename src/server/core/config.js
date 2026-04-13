/*
  src/server/core/config.js

  Stores server paths, env values, and shared server constants.
*/

import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const ROOT = process.cwd();
const ENV_PATH = join(ROOT, ".env");

loadEnvFile();

export const PUBLIC_DIR = join(ROOT, "public");
export const PACKAGE_JSON = join(ROOT, "package.json");
export const DEVICE_CONFIG = process.env.DEVICE_CONFIG_PATH || join(ROOT, "config", "devices.json");
export const SETTINGS_CONFIG = process.env.SETTINGS_CONFIG_PATH || join(ROOT, "config", "settings.json");
export const SESSION_CONFIG = process.env.SESSION_CONFIG_PATH || join(ROOT, "config", "sessions.json");
export const MODE = (process.env.MODE || "hub").toLowerCase();
export const DEV_MODE = (process.env.DEV_MODE || "").toLowerCase();
export const HOST = process.env.HOST || "127.0.0.1";
export const PORT = Number(process.env.PORT || (MODE === "agent" ? 3020 : 3010));
export const REQUEST_URL_BASE = "http://localhost";
export const UI_TOKEN = process.env.PASSWORD || "";
export const AGENT_TOKEN = process.env.AGENT_TOKEN || "";
export const DEVICE_ID = process.env.DEVICE_ID || "";
export const INSTANCE_URL = process.env.INSTANCE_URL || "";
export const WOL_HOST = process.env.WOL_HOST || "255.255.255.255";
export const WOL_PORT = Number(process.env.WOL_PORT || 9);
export const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_INTERVAL_MS || 5000);
export const HEARTBEAT_STALE_MS = Number(process.env.HEARTBEAT_STALE_MS || 12000);
export const MAX_SPACES = Number(process.env.MAX_SPACES || 10);
export const GITHUB_RELEASE_API = "https://api.github.com/repos/QuintixLabs/Relay/releases/latest";
export const RELEASES_URL = "https://github.com/QuintixLabs/Relay/releases";

export const STATIC_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function loadEnvFile() {
  if (!existsSync(ENV_PATH)) {
    return;
  }

  const raw = readFileSync(ENV_PATH, "utf8");

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
