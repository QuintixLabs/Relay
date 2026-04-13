/*
  src/server/data/presence.js

  Tracks device presence and sends agent heartbeats to the Hub.
*/

import {
  AGENT_TOKEN,
  INSTANCE_URL,
  DEVICE_ID,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_STALE_MS,
  HOST,
  MODE,
  PORT
} from "../core/config.js";

const devicePresence = new Map();
const HEARTBEAT_TIMEOUT_MS = 5000;
const REVERSE_PROBE_TIMEOUT_MS = 2500;

function isFresh(entry) {
  return Boolean(entry && Date.now() - entry.lastSeenAt <= HEARTBEAT_STALE_MS);
}

function normalizePresenceOs(value) {
  const platform = String(value || "").trim().toLowerCase();

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

function parseHostPort(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return {
      host: "",
      port: 0
    };
  }

  if (raw.startsWith("[")) {
    const match = raw.match(/^\[([^\]]+)\](?::(\d+))?$/);

    if (!match) {
      return {
        host: raw,
        port: 0
      };
    }

    return {
      host: match[1] ? `[${match[1]}]` : "",
      port: Number(match[2] || 0)
    };
  }

  const colonCount = (raw.match(/:/g) || []).length;

  if (colonCount === 1) {
    const [host, port] = raw.split(":");
    return {
      host: String(host || "").trim(),
      port: Number(port || 0)
    };
  }

  return {
    host: raw,
    port: 0
  };
}

function getPresenceEndpoint(device, entry) {
  const savedTarget = parseHostPort(device?.host);
  const heartbeatHost = String(entry?.host || "").trim();
  const savedHost = savedTarget.host;
  const savedPort = savedTarget.port || Number(device?.port || 0);
  const heartbeatPort = Number(entry?.port || 0);
  const host = savedHost || heartbeatHost;
  const port =
    isFresh(entry) &&
    Number.isInteger(heartbeatPort) &&
    heartbeatPort > 0
      ? heartbeatPort
      : savedPort;

  return { host, port };
}

function getReverseHealthUrl(host, port) {
  const normalizedHost = String(host || "").trim();
  const normalizedPort = Number(port || 0);

  if (!normalizedHost || !Number.isInteger(normalizedPort) || normalizedPort < 1 || normalizedPort > 65535) {
    return null;
  }

  try {
    return new URL(`/health`, `http://${normalizedHost}:${normalizedPort}`);
  } catch {
    return null;
  }
}

async function probePresence(deviceId, device = null) {
  const entry = devicePresence.get(deviceId);

  if (!isFresh(entry) || entry?.probePending) {
    return;
  }

  const target = getPresenceEndpoint(device, entry);
  const healthUrl = getReverseHealthUrl(target.host, target.port);

  if (!healthUrl) {
    devicePresence.set(deviceId, {
      ...entry,
      reachable: false,
      probePending: false
    });
    return;
  }

  devicePresence.set(deviceId, {
    ...entry,
    probePending: true
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REVERSE_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      signal: controller.signal
    });

    const nextEntry = devicePresence.get(deviceId);

    if (!nextEntry) {
      return;
    }

    devicePresence.set(deviceId, {
      ...nextEntry,
      probedHost: target.host,
      probedPort: target.port,
      reachable: response.ok,
      probePending: false
    });
  } catch {
    const nextEntry = devicePresence.get(deviceId);

    if (!nextEntry) {
      return;
    }

    devicePresence.set(deviceId, {
      ...nextEntry,
      probedHost: target.host,
      probedPort: target.port,
      reachable: false,
      probePending: false
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function getPresenceEntry(deviceId) {
  return devicePresence.get(deviceId) || null;
}

export function getPresenceStatuses(devices) {
  return Object.fromEntries(
    devices.map((device) => {
      const entry = devicePresence.get(device.id);
      const target = getPresenceEndpoint(device, entry);
      const targetChanged =
        String(entry?.probedHost || "") !== String(target.host || "") ||
        Number(entry?.probedPort || 0) !== Number(target.port || 0);

      if (isFresh(entry) && targetChanged && !entry?.probePending) {
        void probePresence(device.id, device);
      }

      const online = isFresh(entry) && entry?.reachable === true && !targetChanged;
      return [
        device.id,
        {
          state: online ? "online" : "offline",
          lastSeenAt: entry?.lastSeenAt || null,
          os:
            (isFresh(entry) ? normalizePresenceOs(entry?.platform) : "") ||
            (String(device?.os || "unknown").trim() || "unknown"),
          host: target.host,
          port: target.port
        }
      ];
    })
  );
}

export async function recordPresence(deviceId, payload, device = null) {
  const previousEntry = devicePresence.get(deviceId) || null;

  devicePresence.set(deviceId, {
    lastSeenAt: Date.now(),
    host: String(payload.host || ""),
    port: Number(payload.port || 0),
    platform: String(payload.platform || ""),
    os: normalizePresenceOs(payload.platform || payload.os),
    reachable: previousEntry?.reachable === true,
    probePending: false,
    probedHost: previousEntry?.probedHost || "",
    probedPort: Number(previousEntry?.probedPort || 0)
  });

  await probePresence(deviceId, device);
  return getPresenceEntry(deviceId);
}

export function getPresenceTarget(device) {
  const entry = devicePresence.get(device?.id);
  const target = getPresenceEndpoint(device, entry);

  if (
    target.host &&
    Number.isInteger(target.port) &&
    target.port > 0
  ) {
    return target;
  }

  return {
    host: "",
    port: 0
  };
}

async function sendHeartbeat() {
  if (!INSTANCE_URL || !DEVICE_ID || !AGENT_TOKEN) {
    return;
  }

  const url = new URL("/api/device-heartbeat", INSTANCE_URL);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);

  try {
    await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${AGENT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceId: DEVICE_ID,
        host: HOST,
        port: PORT,
        platform: process.platform
      })
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function startHeartbeatLoop() {
  if (MODE !== "agent" || !INSTANCE_URL || !DEVICE_ID || !AGENT_TOKEN) {
    return;
  }

  const beat = async () => {
    try {
      await sendHeartbeat();
    } catch {
      // Ignore transient heartbeat errors and try again on the next interval.
    }
  };

  void beat();
  setInterval(beat, HEARTBEAT_INTERVAL_MS);
}
