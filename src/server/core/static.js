/*
  src/server/core/static.js

  Serves files from the public folder (page routes, 404 etc...).
*/

import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { PUBLIC_DIR, REQUEST_URL_BASE, STATIC_TYPES } from "./config.js";
import { getSecurityHeaders } from "./http.js";

export async function serveStatic(req, res, sendJson, { appVersion = "", versionAssets = true } = {}) {
  const url = new URL(req.url, REQUEST_URL_BASE);

  // page routes
  const routeMap = {
    "/": "/index.html",
    "/settings": "/settings.html"
  };
  
  const pathname = routeMap[url.pathname] || url.pathname;
  const normalizedPath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(PUBLIC_DIR, normalizedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      await serveNotFoundPage(res, sendJson);
      return;
    }

    const extension = extname(filePath);
    const type = STATIC_TYPES[extension] || "application/octet-stream";
    const contents =
      extension === ".html"
        ? await readVersionedHtml(filePath, appVersion, versionAssets)
        : await readFile(filePath);
    res.writeHead(200, getSecurityHeaders({
      "Content-Type": type,
      "Cache-Control": "no-store"
    }));
    res.end(contents);
  } catch {
    await serveNotFoundPage(res, sendJson, { appVersion, versionAssets });
  }
}

async function serveNotFoundPage(res, sendJson, { appVersion = "", versionAssets = true } = {}) {
  try {
    const filePath = join(PUBLIC_DIR, "404.html");
    const contents = await readVersionedHtml(filePath, appVersion, versionAssets);
    res.writeHead(404, getSecurityHeaders({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }));
    res.end(contents);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

async function readVersionedHtml(filePath, appVersion, versionAssets) {
  const contents = await readFile(filePath, "utf8");

  if (!versionAssets) {
    return Buffer.from(contents.replaceAll("?v=%APP_VERSION%", ""), "utf8");
  }

  return Buffer.from(contents.replaceAll("%APP_VERSION%", appVersion || "0.0.0"), "utf8");
}
