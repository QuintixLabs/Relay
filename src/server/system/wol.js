/*
  src/server/system/wol.js

  Sends Wake-on-LAN packets to devices that support wake.
*/

import dgram from "node:dgram";
import { WOL_HOST, WOL_PORT } from "../core/config.js";

function normalizeMac(mac) {
  const hex = String(mac || "").replace(/[^a-fA-F0-9]/g, "").toLowerCase();
  if (hex.length !== 12) {
    throw new Error("Invalid MAC address");
  }
  return Buffer.from(hex, "hex");
}

export async function sendWakePacket(mac, host = WOL_HOST, port = WOL_PORT) {
  const targetMac = normalizeMac(mac);
  const packet = Buffer.alloc(102);
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
      socket.send(packet, port, host, (error) => {
        socket.close();
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });
}
