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
