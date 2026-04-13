/*
  src/server/routes/hub/index.js

  Handles the Hub routes for the web app and device API.
*/

import { createHubDevicesRouteHandler } from "./devices/index.js";
import { createHubHeartbeatRouteHandler } from "./heartbeat.js";
import { createHubSettingsRouteHandler } from "./settings/index.js";
import { createHubSpacesRouteHandler } from "./spaces.js";
import { REQUEST_URL_BASE } from "../../core/config.js";

export function createHubRouteHandler({
  // App values.
  WOL_HOST,
  DEV_MODE,
  HOST,
  MAX_SPACES,
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
  changeHubPassword,
  clearAllHubSessions,
  clearHubSession,
  createHubSession,
  loadConfig,
  loadDevices,
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
}) {
const handleHubSettings = createHubSettingsRouteHandler({
HOST,
MAX_SPACES,
RELEASES_URL,
changeHubPassword,
clearAllHubSessions,
clearHubSession,
createHubSession,
getAppVersion,
getLatestReleaseVersion,
hasHubPassword,
hasEnvHubPassword,
loadConfig,
loadSettings,
normalizeOrders,
readBody,
requireHubMutation,
requireHubPassword,
requireSameOrigin,
requireUiToken,
saveConfig,
saveHubPassword,
saveSettings,
sendJson,
verifyHubPassword,
validateDeviceInput,
validateSpaceInput
});

const handleHubSpaces = createHubSpacesRouteHandler({
loadConfig,
readBody,
requireHubMutation,
requireUiToken,
sanitizeSpace,
saveConfig,
sendJson,
validateSpaceInput
});

const handleHubDevices = createHubDevicesRouteHandler({
WOL_HOST,
WOL_PORT,
getPresenceStatuses,
loadConfig,
loadDevices,
mergeStoredDeviceSecrets,
normalizeOrderList,
normalizeOrders,
proxyDeviceAction,
readBody,
reorderOrderList,
requireHubMutation,
requireHubPassword,
requireUiToken,
sanitizeDevice,
sanitizeSpace,
saveConfig,
sendJson,
sendWakePacket,
validateDeviceInput,
verifyHubPassword
});

const handleHubHeartbeat = createHubHeartbeatRouteHandler({
loadConfig,
loadDevices,
readBody,
recordPresence,
saveConfig,
sendJson
});

return async function handleHub(req, res) {
const url = new URL(req.url, REQUEST_URL_BASE);

// --------------------------------------------------------------------------
// Health and app info
// --------------------------------------------------------------------------
if (req.method === "GET" && url.pathname === "/api/health") {
  sendJson(res, 200, {
    ok: true,
    app: "relay-hub"
  });
  return;
}

if (await handleHubSettings(req, res, url)) {
  return;
}

if (await handleHubSpaces(req, res, url)) {
  return;
}

if (await handleHubDevices(req, res, url)) {
  return;
}

// --------------------------------------------------------------------------
// Agent heartbeat
// --------------------------------------------------------------------------
if (await handleHubHeartbeat(req, res, url)) {
  return;
}

// --------------------------------------------------------------------------
// Static files
// --------------------------------------------------------------------------
await serveStatic(req, res, sendJson, {
  appVersion: await getAssetVersion(),
  versionAssets: DEV_MODE !== "development"
});
};
}
