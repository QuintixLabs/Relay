/*
  src/server/routes/hub/settings/instance.js

  Handles Hub meta, settings, and reset routes.
*/

import {
  isLocalSetupRequest,
  matchesRoute,
  requireMutationAccess,
  requireReadAccess,
  sendRouteError
} from "./helpers.js";

function sendSettingsResponse(res, settings, hasEnvHubPassword, sendJson, statusCode = 200, extra = {}) {
  sendJson(res, statusCode, {
    ...extra,
    settings: {
      passwordManagedByEnv: hasEnvHubPassword(),
      feedbackDuration: settings.feedbackDuration,
      feedbackMode: settings.feedbackMode
    }
  });
}

export function createHubSettingsInstanceRouteHandler({
  MAX_SPACES,
  RELEASES_URL,
  getAppVersion,
  getLatestReleaseVersion,
  hasEnvHubPassword,
  hasHubPassword,
  loadSettings,
  readBody,
  requireHubMutation,
  requireUiToken,
  saveConfig,
  saveSettings,
  sendJson
}) {
  async function handleMetaRoute(req, res, url) {
    if (!matchesRoute(req, url.pathname, "GET", "/api/meta")) {
      return false;
    }

    const version = await getAppVersion();
    const latestVersion = await getLatestReleaseVersion(version);

    sendJson(res, 200, {
      ok: true,
      maxSpaces: MAX_SPACES,
      setupRequired: !hasHubPassword(),
      setupBlocked: !hasHubPassword() && !isLocalSetupRequest(req),
      version,
      latestVersion,
      releasesUrl: RELEASES_URL
    });
    return true;
  }

  async function handleSettingsRoutes(req, res, url) {
    if (url.pathname !== "/api/settings") {
      return false;
    }

    if (!requireReadAccess(req, res, requireUiToken, sendJson)) {
      return true;
    }

    if (req.method === "GET") {
      try {
        const settings = await loadSettings();
        sendSettingsResponse(res, settings, hasEnvHubPassword, sendJson);
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
      return true;
    }

    if (req.method === "PATCH") {
      if (!requireMutationAccess(req, res, requireHubMutation, sendJson)) {
        return true;
      }

      try {
        const payload = await readBody(req);
        const currentSettings = await loadSettings();

        await saveSettings({
          ...currentSettings,
          feedbackDuration: payload.feedbackDuration,
          feedbackMode: payload.feedbackMode
        });

        const settings = await loadSettings();
        sendSettingsResponse(res, settings, hasEnvHubPassword, sendJson, 200, { ok: true });
      } catch (error) {
        sendRouteError(res, error, sendJson);
      }
      return true;
    }

    return false;
  }

  async function handleResetRoute(req, res, url) {
    if (!matchesRoute(req, url.pathname, "POST", "/api/reset")) {
      return false;
    }

    if (!requireMutationAccess(req, res, requireHubMutation, sendJson)) {
      return true;
    }

    try {
      const payload = await readBody(req);
      const confirm = String(payload.confirm || "").trim();

      if (confirm !== "DELETE") {
        sendJson(res, 400, { error: 'Type "DELETE" to continue.' });
        return true;
      }

      await saveConfig({
        devices: [],
        spaces: [],
        orders: { all: [], spaces: {} }
      });

      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendRouteError(res, error, sendJson);
    }

    return true;
  }

  return async function handleHubSettingsInstance(req, res, url) {
    if (await handleMetaRoute(req, res, url)) {
      return true;
    }

    if (await handleSettingsRoutes(req, res, url)) {
      return true;
    }

    if (await handleResetRoute(req, res, url)) {
      return true;
    }

    return false;
  };
}
