/*
  src/server.js

  Runs the main server for the Hub and agent modes.
*/

import { createServer } from "node:http";
import { networkInterfaces } from "node:os";

// --------------------------------------------------------------------------
// Core server helpers
// --------------------------------------------------------------------------
import {
  // Release info.
  RELEASES_URL,

  // Server values.
  DEV_MODE,
  HOST,
  MODE,
  PORT,

  // App rules.
  MAX_SPACES,

  // Wake-on-LAN.
  WOL_HOST,
  WOL_PORT
} from "./server/core/config.js";

import {
  createRateLimitedPasswordVerifier,
  createSessionManager,
  requireToken
} from "./server/core/auth.js";
import { readBody, requireSameOrigin, sendJson } from "./server/core/http.js";
import { getAppVersion, getAssetVersion, getLatestReleaseVersion } from "./server/core/version.js";
import { serveStatic } from "./server/core/static.js";

// --------------------------------------------------------------------------
// Data helpers
// --------------------------------------------------------------------------
import {
  loadConfig,
  loadDevices,
  mergeStoredDeviceSecrets,
  normalizeOrderList,
  normalizeOrders,
  proxyDeviceAction,
  reorderOrderList,
  sanitizeDevice,
  saveConfig,
  validateDeviceInput
} from "./server/data/devices.js";

import { getPresenceStatuses, recordPresence, startHeartbeatLoop } from "./server/data/presence.js";
import { sanitizeSpace, validateSpaceInput } from "./server/data/spaces.js";
import {
  changeHubPassword,
  hasHubPassword,
  hasEnvHubPassword,
  loadSettings,
  saveHubPassword,
  saveSettings,
  verifyHubPassword
} from "./server/data/settings.js";

// --------------------------------------------------------------------------
// System actions
// --------------------------------------------------------------------------
import { runPowerAction } from "./server/system/power.js";
import { sendWakePacket } from "./server/system/wol.js";

// --------------------------------------------------------------------------
// Route handlers
// --------------------------------------------------------------------------
import { createAgentRouteHandler } from "./server/routes/agent.js";
import { createHubRouteHandler } from "./server/routes/hub/index.js";

// --------------------------------------------------------------------------
// Network info
// --------------------------------------------------------------------------
function getLocalIps() {
  const nets = networkInterfaces();
  const ips = [];

  for (const records of Object.values(nets)) {
    for (const record of records || []) {
      if (record.family === "IPv4" && !record.internal) {
        ips.push(record.address);
      }
    }
  }

  return ips.sort();
}

// --------------------------------------------------------------------------
// Route setup
// --------------------------------------------------------------------------
const handleAgent = createAgentRouteHandler({
  getLocalIps,
  readBody,
  requireToken,
  runPowerAction,
  sendJson
});

await loadSettings();

const sessionManager = await createSessionManager();

const requireHubPassword = createRateLimitedPasswordVerifier({
  verify: verifyHubPassword,
  getKey: (req) => {
    const address = String(req?.socket?.remoteAddress || "unknown").trim() || "unknown";
    return `login:${address}`;
  }
});

const requireUiToken = (req, res, sendJson) => {
  return sessionManager.requireSession(req, res, sendJson);
};

const requireHubMutation = (req, res, sendJson) => {
  return requireUiToken(req, res, sendJson) && requireSameOrigin(req, res, sendJson);
};

const handleHub = createHubRouteHandler({
  // App values.
  WOL_HOST,
  DEV_MODE,
  HOST,
  MAX_SPACES,
  PORT,
  RELEASES_URL,
  WOL_PORT,

  // Version info.
  getAssetVersion,
  getAppVersion,
  getLatestReleaseVersion,
  hasEnvHubPassword,
  hasHubPassword,

  // Device presence.
  getPresenceStatuses,
  recordPresence,

  // Device file.
  clearAllHubSessions: sessionManager.clearAllSessions,
  clearHubSession: sessionManager.clearSession,
  createHubSession: sessionManager.createSession,
  loadConfig,
  loadDevices,
  changeHubPassword,
  loadSettings,
  mergeStoredDeviceSecrets,
  saveHubPassword,
  saveConfig,
  saveSettings,
  verifyHubPassword,

  // Device order and actions.
  normalizeOrderList,
  normalizeOrders,
  proxyDeviceAction,
  reorderOrderList,

  // Request helpers.
  readBody,
  requireHubMutation,
  requireHubPassword,
  requireSameOrigin,
  requireToken,
  requireUiToken,
  sendJson,
  serveStatic,

  // Data cleanup.
  sanitizeDevice,
  sanitizeSpace,

  // Power and wake.
  sendWakePacket,

  // Input checks.
  validateDeviceInput,
  validateSpaceInput
});

// --------------------------------------------------------------------------
// HTTP server
// --------------------------------------------------------------------------
const server = createServer(async (req, res) => {
  try {
    if (MODE === "agent") {
      await handleAgent(req, res);
      return;
    }

    await handleHub(req, res);
  } catch (error) {
    sendJson(res, Number(error?.statusCode) || 500, { error: error.message });
  }
});

// --------------------------------------------------------------------------
// Start server
// --------------------------------------------------------------------------
server.listen(PORT, HOST, () => {

  // sum colors (yes i love colors sorry)
  const yellow = "\x1b[33m";
  const aqua = "\x1b[36m";
  const reset = "\x1b[0m";

  const target = `http://${HOST}:${PORT}`;
  const modeLabel = MODE === "agent" ? "Relay Agent" : "Relay Hub";
  console.log(`${yellow}[${modeLabel}]${reset} Listening on ${aqua}${target}${reset}`);
});

startHeartbeatLoop();
