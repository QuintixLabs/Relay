/*
  src/server/routes/hub/devices/actions.js

  Handles Hub device action routes.
*/

import {
  findDeviceById,
  matchesDeviceRoute,
  parseDeviceRoute,
  requireMutationAccess,
  sendNotFound
} from "./helpers.js";

function isSupportedDeviceAction(action) {
  return ["shutdown", "restart", "sleep"].includes(action);
}

export function createHubDeviceActionRouteHandler({
  WOL_HOST,
  WOL_PORT,
  loadDevices,
  proxyDeviceAction,
  requireHubMutation,
  sendJson,
  sendWakePacket
}) {
  return async function handleHubDeviceAction(req, res, url) {
    if (!matchesDeviceRoute(req, url.pathname, "POST")) {
      return false;
    }

    if (!requireMutationAccess(req, res, requireHubMutation, sendJson)) {
      return true;
    }

    const { deviceId, action } = parseDeviceRoute(url.pathname);
    if (!deviceId || !action) {
      sendNotFound(res, sendJson, "Unknown route");
      return true;
    }

    try {
      const devices = await loadDevices();
      const device = findDeviceById(devices, deviceId);

      if (!device) {
        sendNotFound(res, sendJson);
        return true;
      }

      if (action !== "wake" && !(device.actions || []).includes(action)) {
        sendJson(res, 400, { error: "Action is not enabled for this device" });
        return true;
      }

      if (action === "wake") {
        if (!device.mac) {
          sendJson(res, 400, { error: "Wake is not configured for this device" });
          return true;
        }

        await sendWakePacket(device.mac, device.wolHost || WOL_HOST, device.wolPort || WOL_PORT);
        sendJson(res, 200, { ok: true, action, device: device.name });
        return true;
      }

      if (!isSupportedDeviceAction(action)) {
        sendJson(res, 404, { error: "Unknown action" });
        return true;
      }

      const payload = await proxyDeviceAction(device, action);
      sendJson(res, 200, { ok: true, action, device: device.name, result: payload });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }

    return true;
  };
}
