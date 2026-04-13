/*
  src/server/routes/hub/devices/read.js

  Handles Hub device read routes.
*/

import {
  findDeviceById,
  getRequestOrigin,
  matchesDeviceRoute,
  matchesRoute,
  parseDeviceRoute,
  requireMutationAccess,
  requireReadAccess,
  sendNotFound,
  sendRouteError
} from "./helpers.js";

export function createHubDeviceReadRouteHandler({
  getPresenceStatuses,
  loadConfig,
  loadDevices,
  readBody,
  requireHubMutation,
  requireUiToken,
  sanitizeDevice,
  sanitizeSpace,
  sendJson,
  verifyHubPassword
}) {
  async function readPasswordPayload(req, res) {
    const payload = await readBody(req);
    const password = String(payload?.password || "").trim();

    if (!password) {
      sendJson(res, 400, { error: "Enter your current password." });
      return null;
    }

    if (!(await verifyHubPassword(password))) {
      sendJson(res, 400, { error: "Current password is wrong." });
      return null;
    }

    return payload;
  }

  async function handleDeviceListRoute(req, res, url) {
    if (!matchesRoute(req, url.pathname, "GET", "/api/devices")) {
      return false;
    }

    if (!requireReadAccess(req, res, requireUiToken, sendJson)) {
      return true;
    }

    try {
      const config = await loadConfig();
      sendJson(res, 200, {
        devices: (config.devices || []).map((device) => sanitizeDevice(device)),
        spaces: (config.spaces || []).map(sanitizeSpace),
        orders: config.orders
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }

    return true;
  }

  async function handleDeviceStatusesRoute(req, res, url) {
    if (!matchesRoute(req, url.pathname, "GET", "/api/device-statuses")) {
      return false;
    }

    if (!requireReadAccess(req, res, requireUiToken, sendJson)) {
      return true;
    }

    try {
      const devices = await loadDevices();
      sendJson(res, 200, {
        statuses: getPresenceStatuses(devices)
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }

    return true;
  }

  async function handleGetDeviceRoute(req, res, url) {
    if (!matchesDeviceRoute(req, url.pathname, "GET") && !matchesDeviceRoute(req, url.pathname, "POST")) {
      return false;
    }

    try {
      const { deviceId, action } = parseDeviceRoute(url.pathname);
      if (!deviceId) {
        return false;
      }

      if (req.method === "POST" && (action === "config" || action === "token" || action === "authorize")) {
        if (!requireMutationAccess(req, res, requireHubMutation, sendJson)) {
          return true;
        }
      } else if (!requireReadAccess(req, res, requireUiToken, sendJson)) {
        return true;
      }

      const devices = await loadDevices();
      const device = findDeviceById(devices, deviceId);

      if (!device) {
        sendNotFound(res, sendJson);
        return true;
      }

      if (req.method === "POST" && action === "token") {
        const payload = await readPasswordPayload(req, res);

        if (!payload) {
          return true;
        }

        sendJson(res, 200, {
          ok: true,
          token: String(device.token || "").trim()
        });
        return true;
      }

      if (req.method === "POST" && action === "authorize") {
        const payload = await readPasswordPayload(req, res);

        if (!payload) {
          return true;
        }

        sendJson(res, 200, {
          ok: true
        });
        return true;
      }

      if (req.method === "POST" && action === "config") {
        const payload = await readPasswordPayload(req, res);

        if (!payload) {
          return true;
        }

        sendJson(res, 200, {
          ok: true,
          config: {
            hubUrl: getRequestOrigin(req, url),
            deviceId: String(device.id || "").trim(),
            deviceName: String(device.name || "").trim(),
            token: String(device.token || "").trim(),
            os: String(device.os || "unknown").trim() || "unknown"
          }
        });
        return true;
      }

      if (action) {
        return false;
      }

      sendJson(res, 200, {
        ok: true,
        device: {
          ...sanitizeDevice(device),
          mac: device.mac || "",
          wolHost: device.wolHost || "",
          wolPort: device.wolPort || "",
          wolPortExplicit: Boolean(device.wolPortExplicit)
        }
      });
    } catch (error) {
      sendRouteError(res, error, sendJson);
    }

    return true;
  }

  return async function handleHubDeviceRead(req, res, url) {
    if (await handleDeviceListRoute(req, res, url)) {
      return true;
    }

    if (await handleDeviceStatusesRoute(req, res, url)) {
      return true;
    }

    if (await handleGetDeviceRoute(req, res, url)) {
      return true;
    }

    return false;
  };
}
