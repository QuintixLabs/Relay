/*
  src/server/routes/hub/devices/index.js

  Composes the Hub device route handlers.
*/

import { createHubDeviceActionRouteHandler } from "./actions.js";
import { createHubDeviceReadRouteHandler } from "./read.js";
import { createHubDeviceWriteRouteHandler } from "./write.js";

export function createHubDevicesRouteHandler(dependencies) {
  const handleRead = createHubDeviceReadRouteHandler(dependencies);
  const handleWrite = createHubDeviceWriteRouteHandler(dependencies);
  const handleAction = createHubDeviceActionRouteHandler(dependencies);

  return async function handleHubDevices(req, res, url) {
    if (await handleRead(req, res, url)) {
      return true;
    }

    if (await handleWrite(req, res, url)) {
      return true;
    }

    if (await handleAction(req, res, url)) {
      return true;
    }

    return false;
  };
}
