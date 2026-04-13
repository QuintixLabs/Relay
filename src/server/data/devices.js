/*
  src/server/data/devices.js

  Holds device data helpers used by the server.
*/

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { WOL_PORT } from "../core/config.js";
import { DEVICE_CONFIG } from "../core/config.js";
const DEVICE_ACTION_TIMEOUT_MS = 8000;

// --------------------------------------------------------------------------
// Device file
// --------------------------------------------------------------------------
function createEmptyConfig() {
  return {
    devices: [],
    spaces: [],
    orders: {
      all: [],
      spaces: {}
    }
  };
}

export async function loadConfig() {
  let raw = "";

  try {
    raw = await readFile(DEVICE_CONFIG, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return createEmptyConfig();
    }

    throw error;
  }

  const config = raw.trim() ? JSON.parse(raw) : {};
  config.devices = ensureUniqueDeviceIds(config.devices || []);
  config.spaces ||= config.tags || config.categories || [];
  delete config.tags;
  delete config.categories;
  config.devices = config.devices.map((device) => ({
    ...device,
    spaceId: device.spaceId || device.tagId || device.categoryId || null
  }));
  config.orders = normalizeOrders(config);
  return config;
}

export async function saveConfig(config) {
  config.devices = ensureUniqueDeviceIds(config.devices || []);
  config.spaces ||= [];
  config.orders = normalizeOrders(config);
  config.devices = config.devices.map((device) => {
    const nextDevice = { ...device };
    delete nextDevice.tagId;
    delete nextDevice.categoryId;
    return nextDevice;
  });
  delete config.tags;
  delete config.categories;
  await mkdir(dirname(DEVICE_CONFIG), { recursive: true });
  const payload = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(DEVICE_CONFIG, payload, "utf8");
}

export async function loadDevices() {
  const data = await loadConfig();
  return data.devices || [];
}

// --------------------------------------------------------------------------
// Safe device shape
// --------------------------------------------------------------------------
export function sanitizeDevice(device, { includeSecrets = false } = {}) {
  const os = normalizeLegacyOs(device.os);

  const sanitized = {
    id: device.id,
    name: device.name,
    os,
    host: device.host,
    port: device.port,
    actions: device.actions || [],
    hasWake: Boolean(device.mac),
    spaceId: device.spaceId || null
  };

  if (!includeSecrets) {
    return sanitized;
  }

  return {
    ...sanitized,
    token: device.token,
    mac: device.mac || "",
    wolHost: device.wolHost || "",
    wolPort: device.wolPort || WOL_PORT
  };
}

export function mergeStoredDeviceSecrets(existingDevice, input = {}) {
  const nextInput = { ...input };

  const tokenValue = nextInput.token;
  const tokenEmptyString = typeof tokenValue === "string" && !tokenValue.trim();
  const tokenMissing = tokenValue === undefined || tokenValue === null || tokenEmptyString;

  if (tokenMissing && existingDevice?.token !== undefined) {
    nextInput.token = existingDevice.token;
  }

  if (nextInput.wolPort === undefined && existingDevice?.wolPort !== undefined) {
    nextInput.wolPort = existingDevice.wolPort;
  }

  if (nextInput.wolPortExplicit === undefined && existingDevice?.wolPortExplicit !== undefined) {
    nextInput.wolPortExplicit = existingDevice.wolPortExplicit;
  }

  return nextInput;
}

// --------------------------------------------------------------------------
// Device order
// --------------------------------------------------------------------------
export function normalizeOrders(config) {
  const allIds = (config.devices || []).map((device) => device.id);
  const existingOrders = config.orders || {};
  const nextOrders = {
    all: normalizeOrderList(existingOrders.all || [], allIds),
    spaces: {}
  };

  for (const space of config.spaces || []) {
    const spaceDeviceIds = (config.devices || [])
      .filter((device) => device.spaceId === space.id)
      .map((device) => device.id);
    nextOrders.spaces[space.id] = normalizeOrderList(existingOrders.spaces?.[space.id] || [], spaceDeviceIds);
  }

  return nextOrders;
}

export function normalizeOrderList(order, validIds) {
  const seen = new Set();
  const next = [];

  for (const id of order) {
    if (validIds.includes(id) && !seen.has(id)) {
      seen.add(id);
      next.push(id);
    }
  }

  for (const id of validIds) {
    if (!seen.has(id)) {
      next.push(id);
    }
  }

  return next;
}

function createUniqueDeviceId(baseId, seenIds) {
  const normalizedBase = slugifyDeviceId(baseId) || "device";

  if (!seenIds.has(normalizedBase)) {
    seenIds.add(normalizedBase);
    return normalizedBase;
  }

  let suffix = 2;
  while (seenIds.has(`${normalizedBase}-${suffix}`)) {
    suffix += 1;
  }

  const uniqueId = `${normalizedBase}-${suffix}`;
  seenIds.add(uniqueId);
  return uniqueId;
}

export function ensureUniqueDeviceIds(devices) {
  const seenIds = new Set();

  return (Array.isArray(devices) ? devices : []).map((device) => {
    const baseId = String(device?.id || device?.name || "").trim();
    const uniqueId = createUniqueDeviceId(baseId, seenIds);
    return {
      ...device,
      id: uniqueId
    };
  });
}

export function reorderOrderList(order, sourceId, targetId, placement = "before") {
  const nextOrder = [...order];
  const sourceIndex = nextOrder.indexOf(sourceId);
  const targetIndex = nextOrder.indexOf(targetId);

  if (sourceIndex === -1 || targetIndex === -1) {
    throw new Error("Device not found");
  }

  const [sourceDeviceId] = nextOrder.splice(sourceIndex, 1);
  const targetIndexAfterRemoval = nextOrder.indexOf(targetId);
  const insertIndex = placement === "after" ? targetIndexAfterRemoval + 1 : targetIndexAfterRemoval;
  nextOrder.splice(insertIndex, 0, sourceDeviceId);
  return nextOrder;
}

// --------------------------------------------------------------------------
// Device input
// --------------------------------------------------------------------------
export function slugifyDeviceId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeActions(actions) {
  const allowed = new Set(["shutdown", "restart", "sleep"]);
  return Array.from(new Set((Array.isArray(actions) ? actions : []).filter((action) => allowed.has(action))));
}

function normalizeLegacyOs(os) {
  const value = String(os || "").trim().toLowerCase();

  if (value === "ios" || value === "apple" || value === "mac" || value === "darwin") {
    return "macos";
  }

  if (value === "android") {
    return "unknown";
  }

  return value;
}

export function validateDeviceInput(input, existingDevices, currentDeviceId = null) {
  const name = String(input.name || "").trim();
  const os = normalizeLegacyOs(input.os || "unknown");
  const host = String(input.host || "").trim();
  const token = String(input.token || "").trim();
  const mac = String(input.mac || "").trim();
  const wolHost = String(input.wolHost || "").trim();
  const existingDevice = existingDevices.find((device) => device.id === currentDeviceId) || null;
  const port = Number(
    input.port !== undefined && input.port !== null && input.port !== ""
      ? input.port
      : existingDevice?.port || 3020
  );
  const hasExplicitWolPort = input.wolPort !== undefined && input.wolPort !== null && String(input.wolPort).trim() !== "";
  const wolPort = hasExplicitWolPort
    ? Number(input.wolPort)
    : currentDeviceId
      ? null
      : existingDevice?.wolPort !== undefined
        ? Number(existingDevice.wolPort)
        : null;
  const id = currentDeviceId || slugifyDeviceId(input.id || name);
  const actions = normalizeActions(input.actions);
  const allowedOs = new Set(["windows", "linux", "macos", "unknown"]);

  if (!name) {
    throw new Error("Device name is required");
  }

  if (name.length > 32) {
    throw new Error("Device names can be up to 32 characters");
  }

  if (!id) {
    throw new Error("Device ID is invalid");
  }

  if (existingDevices.some((device) => device.id !== currentDeviceId && device.id === id)) {
    throw new Error("A device with that name already exists");
  }

  if (!allowedOs.has(os)) {
    throw new Error("Choose a supported operating system");
  }

  if (!host) {
    throw new Error("Device address is required");
  }

  if (
    existingDevices.some((device) => {
      return (
        device.id !== currentDeviceId &&
        String(device.host || "").trim() === host
      );
    })
  ) {
    throw new Error("A device with that address already exists");
  }

  if (!token) {
    throw new Error("Agent token is required");
  }

  if (token.length < 8 || token.length > 128 || /\s/.test(token)) {
    throw new Error("Agent token must be 8 to 128 characters and cannot contain spaces");
  }

  if (
    existingDevices.some((device) => {
      return (
        device.id !== currentDeviceId &&
        String(device.token || "").trim() === token
      );
    })
  ) {
    throw new Error("A device with that agent token already exists");
  }

  if (wolPort !== null && (!Number.isInteger(wolPort) || wolPort < 1 || wolPort > 65535)) {
    throw new Error("Wake-on-LAN port is invalid");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Device port is invalid");
  }

  return {
    id,
    name,
    os,
    host,
    port,
    token,
    actions,
    spaceId: input.spaceId ? String(input.spaceId).trim() : null,
    mac: mac || undefined,
    wolHost: wolHost || undefined,
    wolPort: wolPort ?? undefined,
    wolPortExplicit: hasExplicitWolPort
  };
}

// --------------------------------------------------------------------------
// Device request
// --------------------------------------------------------------------------
export async function proxyDeviceAction(device, action) {
  const target = getPresenceTarget(device);
  let candidates;

  try {
    candidates = [
      new URL(`/${action}`, `http://${target.host}:${target.port}`),
      new URL(`/api/power/${action}`, `http://${target.host}:${target.port}`)
    ];
  } catch {
    throw new Error("Invalid IP / Host");
  }

  let lastError = null;

  for (const url of candidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEVICE_ACTION_TIMEOUT_MS);
    let response;

    try {
      response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${device.token}`
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error?.name === "AbortError") {
        throw new Error("Device request timed out");
      }

      lastError = error;
      continue;
    }

    clearTimeout(timeoutId);

    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    if (response.status === 404 && url.pathname === `/${action}`) {
      lastError = new Error("Legacy agent route fallback required.");
      continue;
    }

    if (!response.ok) {
      throw new Error(payload.error || `Device responded with ${response.status}`);
    }

    return payload;
  }

  throw lastError || new Error("Couldn't reach the device agent.");
}
import { getPresenceTarget } from "./presence.js";
