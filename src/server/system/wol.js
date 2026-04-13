/*
  src/server/system/wol.js

  Sends Wake-on-LAN packets to devices that support wake.
*/

import dgram from "node:dgram";
import { WOL_HOST, WOL_PORT } from "../core/config.js";

const DEFAULT_WAKE_ATTEMPTS = 3;
const BROADCAST_FALLBACK = "255.255.255.255";

function normalizeMac(mac) {
  const hex = String(mac || "").replace(/[^a-fA-F0-9]/g, "").toLowerCase();
  if (hex.length !== 12) {
    throw new Error("Invalid MAC address");
  }
  return Buffer.from(hex, "hex");
}

function getWakeTargets(host) {
  const primaryHost = String(host || "").trim() || WOL_HOST;
  const targets = [primaryHost];

  if (primaryHost !== BROADCAST_FALLBACK) {
    targets.push(BROADCAST_FALLBACK);
  }

  return targets;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendWakePacket(mac, host = WOL_HOST, port = WOL_PORT) {
  const targetMac = normalizeMac(mac);
  const packet = Buffer.alloc(102);
  const targets = getWakeTargets(host);
  packet.fill(0xff, 0, 6);

  for (let offset = 6; offset < packet.length; offset += 6) {
    targetMac.copy(packet, offset);
  }

  await new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");

    socket.once("error", (error) => {
      socket.close();
      reject(error);
    });

    socket.bind(0, () => {
      socket.setBroadcast(true);

      (async () => {
        try {
          for (let attempt = 0; attempt < DEFAULT_WAKE_ATTEMPTS; attempt += 1) {
            for (const target of targets) {
              await new Promise((sendResolve, sendReject) => {
                socket.send(packet, port, target, (error) => {
                  if (error) {
                    sendReject(error);
                    return;
                  }

                  sendResolve();
                });
              });
            }

            if (attempt < DEFAULT_WAKE_ATTEMPTS - 1) {
              await wait(150);
            }
          }

          socket.close();
          resolve();
        } catch (error) {
          socket.close();
          reject(error);
        }
      })();
    });
  });
}
