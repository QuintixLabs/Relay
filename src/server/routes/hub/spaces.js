/*
  src/server/routes/hub/spaces.js

  Handles Hub space routes.
*/

export function createHubSpacesRouteHandler({
  // Auth and request helpers.
  requireHubMutation,
  readBody,
  sendJson,

  // Space data.
  loadConfig,
  saveConfig,
  sanitizeSpace,
  validateSpaceInput
}) {

function findSpaceById(spaces, spaceId) {
  return (spaces || []).find((entry) => entry.id === spaceId) || null;
}

function parseSpaceRoute(pathname) {
  const [, , , spaceId] = pathname.split("/");
  return {
    spaceId: spaceId || ""
  };
}

async function handleCreateSpaceRoute(req, res, url) {
  if (req.method !== "POST" || url.pathname !== "/api/spaces") {
    return false;
  }

  if (!requireHubMutation(req, res, sendJson)) {
    return true;
  }

  try {
    const config = await loadConfig();
    const payload = await readBody(req);
    const space = validateSpaceInput(payload, config.spaces || []);
    config.spaces ||= [];
    config.spaces.push(space);
    await saveConfig(config);
    sendJson(res, 201, { ok: true, space: sanitizeSpace(space) });
  } catch (error) {
    sendJson(res, Number(error?.statusCode) || 400, { error: error.message });
  }

  return true;
}

async function handleDeleteSpaceRoute(req, res, url) {
  if (req.method !== "DELETE" || !url.pathname.startsWith("/api/spaces/")) {
    return false;
  }

  if (!requireHubMutation(req, res, sendJson)) {
    return true;
  }

  try {
    const { spaceId } = parseSpaceRoute(url.pathname);
    if (!spaceId) {
      sendJson(res, 404, { error: "Space not found" });
      return true;
    }

    const config = await loadConfig();
    const spaces = config.spaces || [];
    const nextSpaces = spaces.filter((space) => space.id !== spaceId);

    if (nextSpaces.length === spaces.length) {
      sendJson(res, 404, { error: "Space not found" });
      return true;
    }

    config.spaces = nextSpaces;
    config.devices = (config.devices || []).map((device) =>
      device.spaceId === spaceId ? { ...device, spaceId: null } : device
    );
    await saveConfig(config);
    sendJson(res, 200, { ok: true, id: spaceId });
  } catch (error) {
    sendJson(res, Number(error?.statusCode) || 400, { error: error.message });
  }

  return true;
}

async function handlePatchSpaceRoute(req, res, url) {
  if (req.method !== "PATCH" || !url.pathname.startsWith("/api/spaces/")) {
    return false;
  }

  if (!requireHubMutation(req, res, sendJson)) {
    return true;
  }

  try {
    const { spaceId } = parseSpaceRoute(url.pathname);
    if (!spaceId) {
      sendJson(res, 404, { error: "Space not found" });
      return true;
    }

    const config = await loadConfig();
    const payload = await readBody(req);
    const name = String(payload.name || "").trim();

    if (!name) {
      sendJson(res, 400, { error: "Space name is required" });
      return true;
    }

    if (name.length > 24) {
      sendJson(res, 400, { error: "Space names can be up to 24 characters" });
      return true;
    }

    const space = findSpaceById(config.spaces, spaceId);
    if (!space) {
      sendJson(res, 404, { error: "Space not found" });
      return true;
    }

    if ((config.spaces || []).some((entry) => entry.id !== spaceId && entry.name.toLowerCase() === name.toLowerCase())) {
      sendJson(res, 400, { error: "A space with that name already exists" });
      return true;
    }

    space.name = name;
    await saveConfig(config);
    sendJson(res, 200, { ok: true, space: sanitizeSpace(space) });
  } catch (error) {
    sendJson(res, Number(error?.statusCode) || 400, { error: error.message });
  }

  return true;
}

return async function handleHubSpaces(req, res, url) {
  if (await handleCreateSpaceRoute(req, res, url)) {
    return true;
  }

  if (await handleDeleteSpaceRoute(req, res, url)) {
    return true;
  }

  if (await handlePatchSpaceRoute(req, res, url)) {
    return true;
  }

  return false;
};
}
