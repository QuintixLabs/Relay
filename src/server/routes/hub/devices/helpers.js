/*
  src/server/routes/hub/devices/helpers.js

  Shared route helpers for Hub device handlers.
*/

export function findDeviceById(devices, deviceId) {
  return (devices || []).find((entry) => entry.id === deviceId) || null;
}

export function matchesRoute(req, pathname, method, route) {
  return req.method === method && pathname === route;
}

export function matchesDeviceRoute(req, pathname, method) {
  return req.method === method && pathname.startsWith("/api/devices/");
}

export function parseDeviceRoute(pathname) {
  const [, , , deviceId, segment] = pathname.split("/");
  return {
    action: segment || "",
    deviceId: deviceId || ""
  };
}

export function getRequestOrigin(req, fallbackUrl) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const host = String(req.headers.host || "").trim();
  const protocol = forwardedProto || fallbackUrl.protocol.replace(":", "") || "http";

  if (!host) {
    return fallbackUrl.origin;
  }

  return `${protocol}://${host}`;
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

export function sendNotFound(res, sendJson, message = "Device not found") {
  sendJson(res, 404, { error: message });
}

function getScopedDeviceIds(devices, spaceId) {
  return (devices || []).filter((device) => device.spaceId === spaceId).map((device) => device.id);
}

export function updateSpaceOrders(config, device, previousSpaceId, normalizeOrders, normalizeOrderList) {
  const orders = normalizeOrders(config);
  const nextSpaceId = device.spaceId || null;

  if (previousSpaceId && orders.spaces[previousSpaceId]) {
    orders.spaces[previousSpaceId] = orders.spaces[previousSpaceId].filter((id) => id !== device.id);
  }

  if (nextSpaceId) {
    orders.spaces[nextSpaceId] = normalizeOrderList(
      [...(orders.spaces[nextSpaceId] || []), device.id],
      getScopedDeviceIds(config.devices, nextSpaceId)
    );
  }

  config.orders = orders;
}
