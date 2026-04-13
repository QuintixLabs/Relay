/*
  src/server/routes/hub/settings/helpers.js

  Shared route helpers for Hub settings handlers.
*/

export function matchesRoute(req, pathname, method, route) {
  return req.method === method && pathname === route;
}

export function matchesBackupRoute(pathname) {
  return pathname.startsWith("/api/backup/");
}

function normalizeHost(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
}

function isLocalHost(value = "") {
  const host = normalizeHost(value);
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

export function isLocalSetupRequest(req) {
  const hostHeader = String(req?.headers?.host || "").trim();
  const forwardedHost = String(req?.headers?.["x-forwarded-host"] || "").split(",")[0].trim();
  const remoteAddress = String(req?.socket?.remoteAddress || "").trim();

  const directHost = normalizeHost(hostHeader.split(":")[0] || hostHeader);
  const proxyHost = normalizeHost(forwardedHost.split(":")[0] || forwardedHost);

  return isLocalHost(directHost) || isLocalHost(proxyHost) || isLocalHost(remoteAddress);
}

export function requireReadAccess(req, res, requireUiToken, sendJson) {
  return requireUiToken(req, res, sendJson);
}

export function requireMutationAccess(req, res, requireHubMutation, sendJson) {
  return requireHubMutation(req, res, sendJson);
}

export function sendRouteError(res, error, sendJson, fallbackStatus = 400) {
  sendJson(res, Number(error?.statusCode) || fallbackStatus, { error: error.message });
}

export function getRememberDuration(payload) {
  return payload.remember ? 7 * 24 * 60 * 60 * 1000 : 0;
}
