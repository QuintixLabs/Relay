/*
  src/server/routes/hub/settings/index.js

  Composes the Hub settings-related route handlers.
*/

import { createHubSettingsAuthRouteHandler } from "./auth.js";
import { createHubSettingsBackupRouteHandler } from "./backup.js";
import { createHubSettingsInstanceRouteHandler } from "./instance.js";

export function createHubSettingsRouteHandler(dependencies) {
  const handleAuth = createHubSettingsAuthRouteHandler(dependencies);
  const handleInstance = createHubSettingsInstanceRouteHandler(dependencies);
  const handleBackup = createHubSettingsBackupRouteHandler(dependencies);

  return async function handleHubSettings(req, res, url) {
    if (await handleInstance(req, res, url)) {
      return true;
    }

    if (await handleAuth(req, res, url)) {
      return true;
    }

    if (await handleBackup(req, res, url)) {
      return true;
    }

    return false;
  };
}
