/*
  public/js/shared/formatters.js

  Formats shared text shown by the app.
*/

export const SESSION_EXPIRED_MESSAGE = "Session expired. Log in again.";
export const WRONG_PASSWORD_MESSAGE = "Wrong password. Try again.";

export function capitalize(value) {
  return value[0].toUpperCase() + value.slice(1);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function normalizeAuthErrorMessage(error, fallback = "") {
  const raw = String(error?.message || "").trim();
  const lower = raw.toLowerCase();

  if (lower.includes("session expired") || lower.includes("unauthorized")) {
    return SESSION_EXPIRED_MESSAGE;
  }

  return raw || fallback;
}

export function formatActionError(error, device, action) {
  const raw = String(error?.message || "").trim();
  const lower = raw.toLowerCase();

  if (!raw || lower === "failed to fetch" || lower === "fetch failed") {
    return `Couldn't reach ${device.name}. Check the connection and make sure the device agent is running.`;
  }

  if (lower.includes("session expired")) {
    return SESSION_EXPIRED_MESSAGE;
  }

  if (lower.includes("unauthorized")) {
    return `Access denied for ${device.name}. Check the device token.`;
  }

  if (lower.includes("not found")) {
    return `${capitalize(action)} isn't available for ${device.name}.`;
  }

  if (lower.includes("action is not enabled")) {
    return `${capitalize(action)} isn't enabled for ${device.name}.`;
  }

  if (lower.includes("wake is not configured")) {
    return `Wake isn't configured for ${device.name} yet.`;
  }

  if (lower.includes("invalid mac")) {
    return `The Wake-on-LAN address for ${device.name} is invalid.`;
  }

  if (lower.includes("command failed")) {
    return `${capitalize(action)} failed on ${device.name}.`;
  }

  if (lower.includes("device responded with")) {
    return `${device.name} returned an unexpected response.`;
  }

  return raw.endsWith(".") ? raw : `${raw}.`;
}

export function formatGlobalError(error) {
  const raw = String(error?.message || "").trim().toLowerCase();

  if (!raw || raw === "failed to fetch" || raw === "fetch failed") {
    return "Couldn't load your devices. Check that Relay is running and try again.";
  }

  if (raw.includes("session expired")) {
    return SESSION_EXPIRED_MESSAGE;
  }

  if (raw.includes("unauthorized")) {
    return WRONG_PASSWORD_MESSAGE;
  }

  return error.message;
}
