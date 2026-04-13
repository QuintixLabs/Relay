/*
  public/js/settings/index.js

  Starts the settings page and wires its parts together.
*/

import { settingsDom } from "./core/dom.js";
import { initializeBackupSettings } from "./modules/backup.js";
import { initializeResetSettings } from "./modules/danger-zone.js";
import { initializeFeedbackSettings } from "./modules/feedback.js";
import { initializeMetaSettings } from "./modules/meta.js";
import { initializePasswordSettings } from "./modules/password.js";

const setupRequired = await resolveSetupRequired();
const activeSession = await resolveActiveSession();

if (setupRequired === true || activeSession === false) {
  window.location.replace("/");
} else {
  document.querySelector(".settings-shell")?.removeAttribute("hidden");
  await initializeFeedbackSettings(settingsDom);
  initializeBackupSettings(settingsDom);
  initializePasswordSettings(settingsDom);
  initializeResetSettings(settingsDom);
  initializeMetaSettings(settingsDom);
}

async function resolveActiveSession() {
  const state = await retryBootCheck(fetchActiveSessionState);

  if (state.status === "ready") {
    return state.value;
  }

  if (state.status === "redirect") {
    return false;
  }

  return true;
}

async function resolveSetupRequired() {
  const state = await retryBootCheck(fetchSetupState);

  if (state.status === "ready") {
    return state.value;
  }

  if (state.status === "redirect") {
    return true;
  }

  return false;
}

async function retryBootCheck(check) {
  const firstAttempt = await check();
  if (firstAttempt.status !== "retry") {
    return firstAttempt;
  }

  await new Promise((resolve) => {
    window.setTimeout(resolve, 120);
  });

  const secondAttempt = await check();
  return secondAttempt.status === "retry"
    ? { status: "unknown" }
    : secondAttempt;
}

async function fetchActiveSessionState() {
  try {
    const response = await fetch("/api/settings", {
      credentials: "same-origin"
    });

    if (response.ok) {
      return { status: "ready", value: true };
    }

    if (response.status === 401 || response.status === 403) {
      return { status: "redirect" };
    }

    return { status: "retry" };
  } catch {
    return { status: "retry" };
  }
}

async function fetchSetupState() {
  try {
    const response = await fetch("/api/meta", {
      credentials: "same-origin"
    });

    if (!response.ok) {
      return { status: "retry" };
    }

    const payload = await response.json();
    return { status: "ready", value: Boolean(payload.setupRequired) };
  } catch {
    return { status: "retry" };
  }
}
