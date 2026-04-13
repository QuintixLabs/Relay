/*
  src/server/routes/hub/heartbeat.js

  Handles Hub device heartbeat auth, throttling, and presence updates.
*/

import { readBearerToken, tokenMatches } from "../../core/auth.js";

const MAX_FAILED_HEARTBEAT_ATTEMPTS = 5;
const HEARTBEAT_AUTH_COOLDOWN_MS = 30_000;
const HEARTBEAT_FAILURE_RETENTION_MS = 10 * 60 * 1000;

export function createHubHeartbeatRouteHandler({
  loadConfig,
  loadDevices,
  readBody,
  recordPresence,
  saveConfig,
  sendJson
}) {
  const heartbeatAuthFailures = new Map();

  function getHeartbeatPort(payload) {
    const port = Number(payload?.port || 0);
    return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : 0;
  }

  function getHeartbeatOs(payload) {
    const platform = String(payload?.platform || payload?.os || "").trim().toLowerCase();

    if (platform === "win32" || platform === "windows") {
      return "windows";
    }

    if (platform === "darwin" || platform === "mac" || platform === "macos") {
      return "macos";
    }

    if (platform === "linux") {
      return "linux";
    }

    return "unknown";
  }

  function getClientAddress(req) {
    return String(req.socket?.remoteAddress || "unknown").trim() || "unknown";
  }

  function getIpKey(req) {
    return `ip:${getClientAddress(req)}`;
  }

  function getDeviceKey(deviceId) {
    return `device:${String(deviceId || "").trim() || "unknown"}`;
  }

  function pruneHeartbeatFailures(now = Date.now()) {
    for (const [key, state] of heartbeatAuthFailures.entries()) {
      const blockedUntil = Number(state?.blockedUntil || 0);
      const lastSeenAt = Number(state?.lastSeenAt || 0);
      const expiredBlock = blockedUntil > 0 && blockedUntil <= now;
      const expiredIdle = lastSeenAt > 0 && now - lastSeenAt > HEARTBEAT_FAILURE_RETENTION_MS;

      if (expiredBlock || expiredIdle) {
        heartbeatAuthFailures.delete(key);
      }
    }
  }

  function getHeartbeatFailureState(key) {
    const now = Date.now();
    const current = heartbeatAuthFailures.get(key);

    if (!current) {
      return {
        failures: 0,
        blockedUntil: 0,
        lastSeenAt: 0
      };
    }

    if (current.blockedUntil && current.blockedUntil <= now) {
      heartbeatAuthFailures.delete(key);
      return {
        failures: 0,
        blockedUntil: 0,
        lastSeenAt: 0
      };
    }

    return current;
  }

  function isHeartbeatClientBlocked(key) {
    return getHeartbeatFailureState(key).blockedUntil > Date.now();
  }

  function getHeartbeatRetryAfterSeconds(key) {
    const state = getHeartbeatFailureState(key);
    const remainingMs = Math.max(0, state.blockedUntil - Date.now());
    return Math.ceil(remainingMs / 1000);
  }

  function registerHeartbeatAuthFailure(key) {
    const now = Date.now();
    const state = getHeartbeatFailureState(key);
    const failures = state.failures + 1;
    const blockedUntil =
      failures >= MAX_FAILED_HEARTBEAT_ATTEMPTS ? now + HEARTBEAT_AUTH_COOLDOWN_MS : 0;

    heartbeatAuthFailures.set(key, {
      failures,
      blockedUntil,
      lastSeenAt: now
    });
  }

  function clearHeartbeatAuthFailures(...keys) {
    for (const key of keys) {
      if (key) {
        heartbeatAuthFailures.delete(key);
      }
    }
  }

  return async function handleHubHeartbeat(req, res, url) {
    if (req.method !== "POST" || url.pathname !== "/api/device-heartbeat") {
      return false;
    }

    try {
      pruneHeartbeatFailures();

      const payload = await readBody(req);
      const deviceId = String(payload.deviceId || "").trim();
      const bearerToken = readBearerToken(req);
      const ipKey = getIpKey(req);

      if (isHeartbeatClientBlocked(ipKey)) {
        const retryAfterSeconds = getHeartbeatRetryAfterSeconds(ipKey);

        res.setHeader("Retry-After", String(retryAfterSeconds));
        sendJson(res, 429, { error: `Too many failed attempts. Try again in ${retryAfterSeconds}s.` });
        return true;
      }

      const devices = await loadDevices();
      const tokenMatchesList = deviceId
        ? []
        : devices.filter((entry) => tokenMatches(entry.token, bearerToken));
      const device = deviceId
        ? devices.find((entry) => entry.id === deviceId)
        : tokenMatchesList[0];
      const storedDeviceKey = device ? getDeviceKey(device.id) : "";

      if (storedDeviceKey && isHeartbeatClientBlocked(storedDeviceKey)) {
        const retryAfterSeconds = getHeartbeatRetryAfterSeconds(storedDeviceKey);

        res.setHeader("Retry-After", String(retryAfterSeconds));
        sendJson(res, 429, { error: `Too many failed attempts. Try again in ${retryAfterSeconds}s.` });
        return true;
      }

      if (!device && !deviceId) {
        registerHeartbeatAuthFailure(ipKey);
        sendJson(res, 401, { error: "Unauthorized" });
        return true;
      }

      if (!deviceId && tokenMatchesList.length > 1) {
        registerHeartbeatAuthFailure(ipKey);
        sendJson(res, 409, { error: "This agent token matches more than one device." });
        return true;
      }

      if (!device) {
        registerHeartbeatAuthFailure(ipKey);
        sendJson(res, 404, { error: "Device not found" });
        return true;
      }

      if (!tokenMatches(device.token, bearerToken)) {
        registerHeartbeatAuthFailure(ipKey);
        registerHeartbeatAuthFailure(storedDeviceKey);
        sendJson(res, 401, { error: "Unauthorized" });
        return true;
      }

      clearHeartbeatAuthFailures(ipKey, storedDeviceKey);

      const heartbeatPort = getHeartbeatPort(payload);
      const heartbeatOs = getHeartbeatOs(payload);
      const presence = await recordPresence(device.id, payload, device);
      let nextDevice = device;

      if (
        (heartbeatPort && Number(device.port || 0) !== heartbeatPort) ||
        (heartbeatOs && heartbeatOs !== "unknown" && device.os !== heartbeatOs)
      ) {
        const config = await loadConfig();
        config.devices = (config.devices || []).map((entry) =>
          entry.id === device.id
            ? {
                ...entry,
                port: heartbeatPort || entry.port,
                os: heartbeatOs && heartbeatOs !== "unknown" ? heartbeatOs : entry.os
              }
            : entry
        );
        nextDevice = config.devices.find((entry) => entry.id === device.id) || device;
        await saveConfig(config);
      }

      sendJson(res, 200, {
        ok: true,
        reachable: presence?.reachable === true,
        device: {
          id: nextDevice.id,
          name: nextDevice.name,
          os: nextDevice.os
        }
      });
    } catch (error) {
      sendJson(res, Number(error?.statusCode) || 400, { error: error.message });
    }

    return true;
  };
}
