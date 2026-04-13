/*
  src/server/data/settings.js

  Loads instance settings and manages the saved Hub password.
*/

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SETTINGS_CONFIG, UI_TOKEN } from "../core/config.js";
import { hashPassword, passwordHashMatchesAsync } from "../core/auth.js";

const DEFAULT_INSTANCE_SETTINGS = {
  passwordHash: "",
  feedbackDuration: 4000,
  feedbackMode: "inline"
};

let instancePasswordHash = "";

function normalizeSettings(settings = {}) {
  return {
    passwordHash: String(settings.passwordHash || "").trim(),
    feedbackMode: settings.feedbackMode === "toast" ? "toast" : "inline",
    feedbackDuration: [2500, 4000, 6000].includes(Number(settings.feedbackDuration))
      ? Number(settings.feedbackDuration)
      : DEFAULT_INSTANCE_SETTINGS.feedbackDuration
  };
}

export async function loadSettings() {
  try {
    const raw = await readFile(SETTINGS_CONFIG, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    const settings = normalizeSettings(parsed);
    instancePasswordHash = settings.passwordHash;
    return settings;
  } catch {
    instancePasswordHash = "";
    return { ...DEFAULT_INSTANCE_SETTINGS };
  }
}

export async function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  instancePasswordHash = normalized.passwordHash;
  const payload = `${JSON.stringify(normalized, null, 2)}\n`;
  await mkdir(dirname(SETTINGS_CONFIG), { recursive: true });
  await writeFile(SETTINGS_CONFIG, payload, "utf8");
}

export function hasHubPassword() {
  return Boolean(UI_TOKEN || instancePasswordHash);
}

export function hasEnvHubPassword() {
  return Boolean(UI_TOKEN);
}

export async function verifyHubPassword(password) {
  if (UI_TOKEN) {
    return UI_TOKEN === password;
  }

  return passwordHashMatchesAsync(instancePasswordHash, password);
}

export async function saveHubPassword(password) {
  const settings = await loadSettings();
  settings.passwordHash = hashPassword(password);
  await saveSettings(settings);
}

export async function changeHubPassword(currentPassword, nextPassword) {
  if (UI_TOKEN) {
    throw new Error("Password is managed by environment variable.");
  }

  if (!instancePasswordHash) {
    throw new Error("This instance is not using a saved password.");
  }

  if (!(await passwordHashMatchesAsync(instancePasswordHash, currentPassword))) {
    throw new Error("Current password is wrong.");
  }

  await saveHubPassword(nextPassword);
}
