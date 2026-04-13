/*
  src/server/core/http.js

  Reads request bodies and sends JSON responses.
*/

import { REQUEST_URL_BASE } from "./config.js";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "img-src 'self' data:",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https://api.github.com"
].join("; ");

export function getSecurityHeaders(extra = {}) {
  return {
    "Content-Security-Policy": CONTENT_SECURITY_POLICY,
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...extra
  };
}

export function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, getSecurityHeaders({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  }));
  res.end(JSON.stringify(body));
}

export function requireSameOrigin(req, res, sendJson) {
  const originHeader = String(req?.headers?.origin || "").trim();

  if (!originHeader) {
    sendJson(res, 403, { error: "Cross-site request blocked." });
    return false;
  }

  try {
    const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "").toLowerCase().split(",")[0].trim();
    const protocol = req?.socket?.encrypted ? "https" : forwardedProto === "https" ? "https" : "http";
    const host = String(req?.headers?.host || "").trim();

    if (!host) {
      sendJson(res, 403, { error: "Cross-site request blocked." });
      return false;
    }

    const requestOrigin = new URL(`${protocol}://${host}`).origin;
    const incomingOrigin = new URL(originHeader, REQUEST_URL_BASE).origin;

    if (incomingOrigin !== requestOrigin) {
      sendJson(res, 403, { error: "Cross-site request blocked." });
      return false;
    }
  } catch {
    sendJson(res, 403, { error: "Cross-site request blocked." });
    return false;
  }

  return true;
}

export async function readBody(req) {
  const MAX_BODY_BYTES = 64 * 1024;
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    totalBytes += chunk.length;

    if (totalBytes > MAX_BODY_BYTES) {
      const error = new Error("Payload too large");
      error.statusCode = 413;
      req.destroy();
      throw error;
    }

    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
