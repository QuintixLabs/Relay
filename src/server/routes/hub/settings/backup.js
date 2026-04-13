/*
  src/server/routes/hub/settings/backup.js

  Handles Hub backup export and import routes.
*/

import {
  matchesBackupRoute,
  matchesRoute,
  requireMutationAccess,
  sendRouteError
} from "./helpers.js";

function normalizeBackupPayload(payload = {}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Backup file is invalid");
  }

  const backup =
    payload && typeof payload === "object" && payload.backup && typeof payload.backup === "object"
      ? payload.backup
      : payload;

  if (!Array.isArray(backup.devices) || !Array.isArray(backup.spaces)) {
    throw new Error("Backup file is invalid");
  }

  return {
    devices: Array.isArray(backup.devices) ? backup.devices : [],
    spaces: Array.isArray(backup.spaces) ? backup.spaces : [],
    orders: backup && typeof backup.orders === "object" && backup.orders ? backup.orders : {}
  };
}

function validateBackupConfig(payload, validateSpaceInput, validateDeviceInput) {
  const backup = normalizeBackupPayload(payload);
  const spaces = [];
  const devices = [];

  for (const rawSpace of backup.spaces) {
    const space = validateSpaceInput(
      {
        id: rawSpace?.id,
        name: rawSpace?.name
      },
      spaces
    );
    spaces.push(space);
  }

  const validSpaceIds = new Set(spaces.map((space) => space.id));

  for (const rawDevice of backup.devices) {
    const nextSpaceId = rawDevice?.spaceId ? String(rawDevice.spaceId).trim() : null;

    if (nextSpaceId && !validSpaceIds.has(nextSpaceId)) {
      throw new Error(`Device "${rawDevice?.name || rawDevice?.id || "Unknown"}" uses a missing space`);
    }

    const device = validateDeviceInput(
      {
        id: rawDevice?.id,
        name: rawDevice?.name,
        os: rawDevice?.os,
        host: rawDevice?.host,
        port: rawDevice?.port,
        token: rawDevice?.token,
        actions: rawDevice?.actions,
        mac: rawDevice?.mac,
        wolHost: rawDevice?.wolHost,
        wolPort: rawDevice?.wolPort,
        spaceId: nextSpaceId
      },
      devices
    );
    devices.push(device);
  }

  return {
    devices,
    spaces,
    orders: {
      all: Array.isArray(backup.orders?.all) ? backup.orders.all : [],
      spaces: backup.orders?.spaces && typeof backup.orders.spaces === "object" ? backup.orders.spaces : {}
    }
  };
}

export function createHubSettingsBackupRouteHandler({
  getAppVersion,
  loadConfig,
  normalizeOrders,
  readBody,
  requireHubMutation,
  saveConfig,
  sendJson,
  validateDeviceInput,
  validateSpaceInput,
  verifyHubPassword
}) {
  return async function handleHubSettingsBackup(req, res, url) {
    if (!matchesBackupRoute(url.pathname)) {
      return false;
    }

    if (matchesRoute(req, url.pathname, "POST", "/api/backup/export")) {
      if (!requireMutationAccess(req, res, requireHubMutation, sendJson)) {
        return true;
      }

      try {
        const payload = await readBody(req);
        const password = String(payload?.password || "").trim();

        if (!password) {
          sendJson(res, 400, { error: "Enter your current password." });
          return true;
        }

        if (!(await verifyHubPassword(password))) {
          sendJson(res, 400, { error: "Current password is wrong." });
          return true;
        }

        const config = await loadConfig();
        const version = await getAppVersion();

        sendJson(res, 200, {
          ok: true,
          backup: {
            app: "Relay",
            version,
            exportedAt: new Date().toISOString(),
            devices: config.devices || [],
            spaces: config.spaces || [],
            orders: config.orders || normalizeOrders(config)
          }
        });
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
      return true;
    }

    if (matchesRoute(req, url.pathname, "POST", "/api/backup/import")) {
      if (!requireMutationAccess(req, res, requireHubMutation, sendJson)) {
        return true;
      }

      try {
        const payload = await readBody(req);
        const nextConfig = validateBackupConfig(payload, validateSpaceInput, validateDeviceInput);
        await saveConfig(nextConfig);
        sendJson(res, 200, { ok: true });
      } catch (error) {
        sendRouteError(res, error, sendJson);
      }
      return true;
    }

    return false;
  };
}
