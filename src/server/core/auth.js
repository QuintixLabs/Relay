/*
  src/server/core/auth.js

  Handles Hub auth, password hashing, rate limiting, and session cookies.
*/

import { createHash, randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SESSION_CONFIG } from "./config.js";

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

// --------------------------------------------------------------------------
// Hash helpers
// --------------------------------------------------------------------------
function sha256(value) {
  return createHash("sha256").update(value).digest();
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

// --------------------------------------------------------------------------
// Request parsing
// --------------------------------------------------------------------------
function readBearer(req) {
  if (!req || !req.headers) {
    return "";
  }

  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return "";
  }
  return header.slice(7).trim();
}

export function readBearerToken(req) {
  return readBearer(req);
}

function readCookies(req) {
  const header = String(req?.headers?.cookie || "");
  const cookies = {};

  for (const part of header.split(/;\s*/)) {
    if (!part) {
      continue;
    }

    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }

  return cookies;
}

// --------------------------------------------------------------------------
// Token and password checks
// --------------------------------------------------------------------------
export function tokenMatches(expected, actual) {
  if (!expected || !actual) {
    return false;
  }

  const left = sha256(expected);
  const right = sha256(actual);
  return timingSafeEqual(left, right);
}

function parsePasswordHash(expectedHash) {
  const [algorithm, salt, storedHash] = String(expectedHash).split(":");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return null;
  }

  return { salt, storedHash };
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export async function passwordHashMatchesAsync(expectedHash, actualPassword) {
  if (!expectedHash || !actualPassword) {
    return false;
  }

  const parsed = parsePasswordHash(expectedHash);
  if (!parsed) {
    return false;
  }

  const actualHash = await new Promise((resolve, reject) => {
    scrypt(actualPassword, parsed.salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey.toString("hex"));
    });
  });

  return timingSafeEqual(Buffer.from(parsed.storedHash, "hex"), Buffer.from(actualHash, "hex"));
}

export function requireToken(expectedToken, req, res, sendJson) {
  const provided = readBearer(req);
  if (!tokenMatches(expectedToken, provided)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return false;
  }
  return true;
}

function getClientKey(req) {
  if (!req) {
    return "unknown";
  }

  return String(req.socket?.remoteAddress || "unknown").trim() || "unknown";
}

function getRetryAfterSeconds(blockedUntil, now) {
  return Math.max(1, Math.ceil((blockedUntil - now) / 1000));
}

function setBlockedAttempt(attempts, clientKey, cooldownMs, now) {
  attempts.set(clientKey, {
    blockedUntil: now + cooldownMs,
    count: 0
  });
}

function setFailedAttempt(attempts, clientKey, nextCount) {
  attempts.set(clientKey, {
    blockedUntil: 0,
    count: nextCount
  });
}

function rejectBlockedAttempt(sendJson, res, blockedUntil, now) {
  sendJson(res, 429, {
    error: `Too many wrong password attempts. Try again in ${getRetryAfterSeconds(blockedUntil, now)}s.`
  });
  return false;
}

function rejectUnauthorized(sendJson, res, message = "Unauthorized") {
  sendJson(res, 401, { error: message });
  return false;
}

function checkRateLimitedFailure({
  attempts,
  clientKey,
  entry,
  now,
  cooldownMs,
  maxAttempts,
  res,
  sendJson,
  unauthorizedMessage = "Unauthorized"
}) {
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return rejectBlockedAttempt(sendJson, res, entry.blockedUntil, now);
  }

  const nextCount = (entry?.count || 0) + 1;

  if (nextCount >= maxAttempts) {
    setBlockedAttempt(attempts, clientKey, cooldownMs, now);
    sendJson(res, 429, {
      error: `Too many wrong password attempts. Try again in ${Math.ceil(cooldownMs / 1000)}s.`
    });
    return false;
  }

  setFailedAttempt(attempts, clientKey, nextCount);
  return rejectUnauthorized(sendJson, res, unauthorizedMessage);
}

// --------------------------------------------------------------------------
// Rate-limited auth guards
// --------------------------------------------------------------------------
export function createRateLimitedPasswordVerifier({
  verify,
  cooldownMs = 60000,
  maxAttempts = 5,
  invalidMessage = "Wrong password. Try again.",
  getKey = getClientKey
} = {}) {
  const attempts = new Map();

  return async function requireRateLimitedPassword(password, req, res, sendJson) {
    const clientKey = getKey(req);
    const now = Date.now();
    const entry = attempts.get(clientKey);

    if (entry?.blockedUntil && entry.blockedUntil > now) {
      return rejectBlockedAttempt(sendJson, res, entry.blockedUntil, now);
    }

    if (await verify(password)) {
      attempts.delete(clientKey);
      return true;
    }

    return checkRateLimitedFailure({
      attempts,
      clientKey,
      entry,
      now,
      cooldownMs,
      maxAttempts,
      res,
      sendJson,
      unauthorizedMessage: invalidMessage
    });
  };
}

// --------------------------------------------------------------------------
// Session persistence
// --------------------------------------------------------------------------
async function loadSessions() {
  let raw = "";

  try {
    raw = await readFile(SESSION_CONFIG, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return new Map();
    }

    throw error;
  }

  const parsed = raw.trim() ? JSON.parse(raw) : {};
  const now = Date.now();
  const sessions = new Map();
  const storedSessions =
    parsed && typeof parsed === "object" && Number(parsed.version) === 2 && parsed.sessions && typeof parsed.sessions === "object"
      ? parsed.sessions
      : {};

  for (const [sessionHash, session] of Object.entries(storedSessions)) {
    const expiresAt = Number(session?.expiresAt || 0);

    if (expiresAt > 0 && expiresAt <= now) {
      continue;
    }

    sessions.set(sessionHash, { expiresAt });
  }

  return sessions;
}

async function persistSessions(sessions) {
  const payload = {
    version: 2,
    sessions: {}
  };
  const now = Date.now();

  for (const [sessionHash, session] of sessions.entries()) {
    const expiresAt = Number(session?.expiresAt || 0);

    if (expiresAt > 0 && expiresAt <= now) {
      sessions.delete(sessionHash);
      continue;
    }

    payload.sessions[sessionHash] = { expiresAt };
  }

  await mkdir(dirname(SESSION_CONFIG), { recursive: true });
  await writeFile(SESSION_CONFIG, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

// --------------------------------------------------------------------------
// Session cookies
// --------------------------------------------------------------------------
export async function createSessionManager({ cookieName = "relay_session" } = {}) {
  const sessions = await loadSessions();
  let persistChain = Promise.resolve();

  function queuePersistSessions() {
    const persistTask = persistChain.then(() => persistSessions(sessions));
    persistChain = persistTask.catch(() => {});
    return persistTask;
  }

  function isSecureRequest(req) {
    if (req?.socket?.encrypted) {
      return true;
    }

    const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "").toLowerCase();
    return forwardedProto.split(",")[0].trim() === "https";
  }

  function buildCookie(req, value, extra = []) {
    return [
      `${cookieName}=${encodeURIComponent(value)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      ...(isSecureRequest(req) ? ["Secure"] : []),
      ...extra
    ].join("; ");
  }

  function getSessionHash(sessionId) {
    return sessionId ? sha256Hex(`${cookieName}:${sessionId}`) : "";
  }

  function getSessionHashFromRequest(req) {
    return getSessionHash(String(readCookies(req)[cookieName] || ""));
  }

  function clearExpiredSession(sessionHash, session) {
    if (!sessionHash || !session?.expiresAt) {
      return false;
    }

    if (Date.now() < session.expiresAt) {
      return false;
    }

    sessions.delete(sessionHash);
    void queuePersistSessions();
    return true;
  }

  function createSession(req, res, { rememberForMs = 0 } = {}) {
    const sessionId = randomBytes(32).toString("hex");
    const sessionHash = getSessionHash(sessionId);
    const expiresAt = Date.now() + (rememberForMs > 0 ? rememberForMs : SESSION_DURATION_MS);

    sessions.set(sessionHash, {
      expiresAt
    });
    void queuePersistSessions();

    res.setHeader(
      "Set-Cookie",
      buildCookie(
        req,
        sessionId,
        rememberForMs > 0 ? [`Max-Age=${Math.max(1, Math.floor(rememberForMs / 1000))}`] : []
      )
    );
    return sessionId;
  }

  async function clearSession(req, res) {
    const sessionHash = getSessionHashFromRequest(req);

    if (sessionHash) {
      sessions.delete(sessionHash);
      await queuePersistSessions();
    }

    res.setHeader("Set-Cookie", buildCookie(req, "", ["Max-Age=0"]));
  }

  async function clearAllSessions() {
    sessions.clear();
    await queuePersistSessions();
  }

  function requireSession(req, res, sendJson) {
    const sessionHash = getSessionHashFromRequest(req);

    if (!sessionHash) {
      sendJson(res, 401, { error: "Session expired. Log in again." });
      return false;
    }

    const session = sessions.get(sessionHash);
    if (!session || clearExpiredSession(sessionHash, session)) {
      void clearSession(req, res).catch(() => {});
      sendJson(res, 401, { error: "Session expired. Log in again." });
      return false;
    }

    return true;
  }

  return {
    clearAllSessions,
    clearSession,
    createSession,
    requireSession
  };
}
