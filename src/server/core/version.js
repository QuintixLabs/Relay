/*
  src/server/core/version.js

  Reads app version info and checks the latest GitHub release.
*/

import { readFile } from "node:fs/promises";
import { GITHUB_RELEASE_API, PACKAGE_JSON } from "./config.js";

const releaseMetaCache = {
  latestVersion: null,
  expiresAt: 0
};
const RELEASE_FETCH_TIMEOUT_MS = 5000;

export async function getAppVersion() {
  try {
    const raw = await readFile(PACKAGE_JSON, "utf8");
    const parsed = JSON.parse(raw);
    return String(parsed.version || "0.0.0");
  } catch {
    return "0.0.0";
  }
}

export async function getAssetVersion() {
  return getAppVersion();
}

export async function getLatestReleaseVersion(currentVersion) {
  if (Date.now() < releaseMetaCache.expiresAt) {
    return releaseMetaCache.latestVersion || currentVersion;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RELEASE_FETCH_TIMEOUT_MS);
    const response = await fetch(GITHUB_RELEASE_API, {
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Relay"
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`GitHub release request failed with ${response.status}`);
    }

    const payload = await response.json();
    const latestVersion = String(payload.tag_name || payload.name || currentVersion).replace(/^v/i, "");

    releaseMetaCache.latestVersion = latestVersion || currentVersion;
    releaseMetaCache.expiresAt = Date.now() + 5 * 60 * 1000;
    return releaseMetaCache.latestVersion;
  } catch {
    releaseMetaCache.latestVersion = currentVersion;
    releaseMetaCache.expiresAt = Date.now() + 60 * 1000;
    return currentVersion;
  }
}
