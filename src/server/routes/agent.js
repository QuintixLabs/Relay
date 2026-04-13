/*
  src/server/routes/agent.js

  Handles the agent-only API routes.
*/

import { AGENT_TOKEN, HOST, PORT, REQUEST_URL_BASE } from "../core/config.js";

export function createAgentRouteHandler({ getLocalIps, readBody, requireToken, runPowerAction, sendJson }) {
  return async function handleAgent(req, res) {
    const url = new URL(req.url, REQUEST_URL_BASE);

    if (req.method === "GET" && url.pathname === "/api/status") {
      if (!requireToken(AGENT_TOKEN, req, res, sendJson)) {
        return;
      }

      sendJson(res, 200, {
        ok: true,
        mode: "agent",
        platform: process.platform,
        host: HOST,
        port: PORT,
        ips: getLocalIps()
      });
      return;
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/power/")) {
      if (!requireToken(AGENT_TOKEN, req, res, sendJson)) {
        return;
      }

      const action = url.pathname.split("/").pop();
      if (!["shutdown", "restart", "sleep"].includes(action)) {
        sendJson(res, 404, { error: "Unknown action" });
        return;
      }

      await readBody(req);

      try {
        await runPowerAction(action);
        sendJson(res, 200, { ok: true, action });
      } catch (error) {
        sendJson(res, Number(error?.statusCode) || 500, { error: error.message });
      }
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  };
}
