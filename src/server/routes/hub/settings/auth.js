/*
  src/server/routes/hub/settings/auth.js

  Handles Hub setup, login, logout, and password-change routes.
*/

import {
  getRememberDuration,
  matchesRoute,
  requireMutationAccess,
  sendRouteError
} from "./helpers.js";

function isLocalSetupHost(HOST) {
  const normalizedHost = String(HOST || "").trim().toLowerCase();
  return normalizedHost === "127.0.0.1" || normalizedHost === "::1" || normalizedHost === "localhost";
}

function validateSetupPassword(password, confirmPassword, res, sendJson) {
  if (!password) {
    sendJson(res, 400, { error: "Enter a password." });
    return false;
  }

  if (password.length < 8) {
    sendJson(res, 400, { error: "Use at least 8 characters." });
    return false;
  }

  if (password !== confirmPassword) {
    sendJson(res, 400, { error: "Passwords do not match." });
    return false;
  }

  return true;
}

function validatePasswordChangeInput(currentPassword, nextPassword, confirmPassword, res, sendJson) {
  if (!currentPassword) {
    sendJson(res, 400, { error: "Enter your current password." });
    return false;
  }

  if (!nextPassword) {
    sendJson(res, 400, { error: "Enter a new password." });
    return false;
  }

  if (nextPassword.length < 8) {
    sendJson(res, 400, { error: "Use at least 8 characters." });
    return false;
  }

  if (nextPassword !== confirmPassword) {
    sendJson(res, 400, { error: "Passwords do not match." });
    return false;
  }

  return true;
}

export function createHubSettingsAuthRouteHandler({
  HOST,
  changeHubPassword,
  clearAllHubSessions,
  clearHubSession,
  createHubSession,
  hasHubPassword,
  readBody,
  requireHubMutation,
  requireHubPassword,
  requireSameOrigin,
  saveHubPassword,
  sendJson,
  verifyHubPassword
}) {
  async function handleSetupRoute(req, res, url) {
    if (!matchesRoute(req, url.pathname, "POST", "/api/setup")) {
      return false;
    }

    if (hasHubPassword()) {
      sendJson(res, 409, { error: "This instance is already set up." });
      return true;
    }

    if (!isLocalSetupHost(HOST)) {
      sendJson(res, 403, { error: "First-time setup is only allowed from this machine." });
      return true;
    }

    try {
      const payload = await readBody(req);
      const password = String(payload.password || "").trim();
      const confirmPassword = String(payload.confirmPassword || "").trim();

      if (!validateSetupPassword(password, confirmPassword, res, sendJson)) {
        return true;
      }

      await saveHubPassword(password);
      createHubSession(req, res, {
        rememberForMs: getRememberDuration(payload)
      });
      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendRouteError(res, error, sendJson);
    }

    return true;
  }

  async function handleLoginRoute(req, res, url) {
    if (!matchesRoute(req, url.pathname, "POST", "/api/login")) {
      return false;
    }

    if (!requireSameOrigin(req, res, sendJson)) {
      return true;
    }

    if (!hasHubPassword()) {
      sendJson(res, 409, { error: "Create a password to finish setup." });
      return true;
    }

    try {
      const payload = await readBody(req);
      const password = String(payload.password || "").trim();

      if (!password) {
        sendJson(res, 400, { error: "Enter a password." });
        return true;
      }

      if (!(await requireHubPassword(password, req, res, sendJson))) {
        return true;
      }

      createHubSession(req, res, {
        rememberForMs: getRememberDuration(payload)
      });
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendRouteError(res, error, sendJson);
    }

    return true;
  }

  async function handleLogoutRoute(req, res, url) {
    if (!matchesRoute(req, url.pathname, "POST", "/api/logout")) {
      return false;
    }

    if (!requireMutationAccess(req, res, requireHubMutation, sendJson)) {
      return true;
    }

    await clearHubSession(req, res);
    sendJson(res, 200, { ok: true });
    return true;
  }

  async function handlePasswordRoute(req, res, url) {
    if (!matchesRoute(req, url.pathname, "POST", "/api/change-password")) {
      return false;
    }

    if (!requireMutationAccess(req, res, requireHubMutation, sendJson)) {
      return true;
    }

    try {
      const payload = await readBody(req);
      const currentPassword = String(payload.currentPassword || "").trim();
      const nextPassword = String(payload.nextPassword || "").trim();
      const confirmPassword = String(payload.confirmPassword || "").trim();

      if (!validatePasswordChangeInput(currentPassword, nextPassword, confirmPassword, res, sendJson)) {
        return true;
      }

      if (currentPassword === nextPassword) {
        sendJson(res, 400, { error: "Use a different password." });
        return true;
      }

      if (!(await verifyHubPassword(currentPassword))) {
        sendJson(res, 400, { error: "Current password is wrong." });
        return true;
      }

      await changeHubPassword(currentPassword, nextPassword);
      await clearAllHubSessions();
      await clearHubSession(req, res);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendRouteError(res, error, sendJson);
    }

    return true;
  }

  return async function handleHubSettingsAuth(req, res, url) {
    if (await handleSetupRoute(req, res, url)) {
      return true;
    }

    if (await handleLoginRoute(req, res, url)) {
      return true;
    }

    if (await handleLogoutRoute(req, res, url)) {
      return true;
    }

    if (await handlePasswordRoute(req, res, url)) {
      return true;
    }

    return false;
  };
}
