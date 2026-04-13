/*
  src/server/routes/hub/devices/write.js

  Handles Hub device create, edit, delete, move, and reorder routes.
*/

import {
  findDeviceById,
  matchesDeviceRoute,
  matchesRoute,
  parseDeviceRoute,
  requireMutationAccess,
  sendNotFound,
  sendRouteError,
  updateSpaceOrders
} from "./helpers.js";

export function createHubDeviceWriteRouteHandler({
  loadConfig,
  loadDevices,
  mergeStoredDeviceSecrets,
  normalizeOrderList,
  normalizeOrders,
  readBody,
  reorderOrderList,
  requireHubMutation,
  sanitizeDevice,
  saveConfig,
  sendJson,
  validateDeviceInput
}) {
  async function handleCreateDeviceRoute(req, res, url) {
    if (!matchesRoute(req, url.pathname, "POST", "/api/devices")) {
      return false;
    }

    if (!requireMutationAccess(req, res, requireHubMutation, sendJson)) {
      return true;
    }

    try {
      const devices = await loadDevices();
      const payload = await readBody(req);
      const device = validateDeviceInput(payload, devices);
      const config = await loadConfig();
      const orders = normalizeOrders(config);

      config.devices.push(device);

      orders.all = normalizeOrderList([device.id, ...(orders.all || [])], config.devices.map((entry) => entry.id));

      if (device.spaceId) {
        const spaceDeviceIds = config.devices
          .filter((entry) => entry.spaceId === device.spaceId)
          .map((entry) => entry.id);
        orders.spaces[device.spaceId] = normalizeOrderList(
          [device.id, ...(orders.spaces[device.spaceId] || [])],
          spaceDeviceIds
        );
      }

      config.orders = orders;

      await saveConfig(config);
      sendJson(res, 201, { ok: true, device: sanitizeDevice(device) });
    } catch (error) {
      sendRouteError(res, error, sendJson);
    }

    return true;
  }

  async function handleReorderDevicesRoute(req, res, url) {
    if (!matchesRoute(req, url.pathname, "POST", "/api/devices/reorder")) {
      return false;
    }

    if (!requireMutationAccess(req, res, requireHubMutation, sendJson)) {
      return true;
    }

    try {
      const payload = await readBody(req);
      const sourceId = String(payload.sourceId || "").trim();
      const targetId = String(payload.targetId || "").trim();
      const placement = payload.placement === "after" ? "after" : "before";
      const scopeSpaceId = payload.scopeSpaceId ? String(payload.scopeSpaceId).trim() : null;

      if (!sourceId || !targetId) {
        sendJson(res, 400, { error: "Both source and target devices are required" });
        return true;
      }

      const config = await loadConfig();
      const orders = normalizeOrders(config);

      if (scopeSpaceId) {
        const scopedIds = (config.devices || [])
          .filter((device) => device.spaceId === scopeSpaceId)
          .map((device) => device.id);

        if (!scopedIds.includes(sourceId) || !scopedIds.includes(targetId)) {
          sendJson(res, 400, { error: "Devices must belong to the selected space" });
          return true;
        }

        orders.spaces[scopeSpaceId] = reorderOrderList(orders.spaces[scopeSpaceId] || scopedIds, sourceId, targetId, placement);
      } else {
        orders.all = reorderOrderList(orders.all, sourceId, targetId, placement);
      }

      config.orders = orders;
      await saveConfig(config);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendRouteError(res, error, sendJson);
    }

    return true;
  }

  async function handleDeleteDeviceRoute(req, res, url) {
    if (!matchesDeviceRoute(req, url.pathname, "DELETE")) {
      return false;
    }

    if (!requireMutationAccess(req, res, requireHubMutation, sendJson)) {
      return true;
    }

    try {
      const { deviceId } = parseDeviceRoute(url.pathname);
      if (!deviceId) {
        sendNotFound(res, sendJson);
        return true;
      }

      const config = await loadConfig();
      const devices = config.devices || [];
      const nextDevices = devices.filter((device) => device.id !== deviceId);

      if (nextDevices.length === devices.length) {
        sendNotFound(res, sendJson);
        return true;
      }

      config.devices = nextDevices;
      await saveConfig(config);
      sendJson(res, 200, { ok: true, id: deviceId });
    } catch (error) {
      sendRouteError(res, error, sendJson);
    }

    return true;
  }

  async function handlePatchDeviceRoute(req, res, url) {
    if (!matchesDeviceRoute(req, url.pathname, "PATCH")) {
      return false;
    }

    if (!requireMutationAccess(req, res, requireHubMutation, sendJson)) {
      return true;
    }

    try {
      const { deviceId, action: segment } = parseDeviceRoute(url.pathname);
      if (!deviceId) {
        sendNotFound(res, sendJson, "Unknown route");
        return true;
      }

      const config = await loadConfig();
      const devices = config.devices || [];
      const device = findDeviceById(devices, deviceId);

      if (!device) {
        sendNotFound(res, sendJson);
        return true;
      }

      const payload = await readBody(req);

      if (!segment) {
        const nextDevice = validateDeviceInput(mergeStoredDeviceSecrets(device, payload), devices, deviceId);
        Object.assign(device, nextDevice);
        await saveConfig(config);
        sendJson(res, 200, { ok: true, device: sanitizeDevice(device) });
        return true;
      }

      if (segment !== "space") {
        sendNotFound(res, sendJson, "Unknown route");
        return true;
      }

      const spaces = config.spaces || [];
      const spaceId = payload.spaceId ? String(payload.spaceId).trim() : null;

      if (spaceId && !spaces.some((space) => space.id === spaceId)) {
        sendJson(res, 400, { error: "Space not found" });
        return true;
      }

      const previousSpaceId = device.spaceId || null;
      device.spaceId = spaceId;
      updateSpaceOrders(config, device, previousSpaceId, normalizeOrders, normalizeOrderList);
      await saveConfig(config);
      sendJson(res, 200, { ok: true, device: sanitizeDevice(device) });
    } catch (error) {
      sendRouteError(res, error, sendJson);
    }

    return true;
  }

  return async function handleHubDeviceWrite(req, res, url) {
    if (await handleCreateDeviceRoute(req, res, url)) {
      return true;
    }

    if (await handleReorderDevicesRoute(req, res, url)) {
      return true;
    }

    if (await handleDeleteDeviceRoute(req, res, url)) {
      return true;
    }

    if (await handlePatchDeviceRoute(req, res, url)) {
      return true;
    }

    return false;
  };
}
