/*
  src/server/system/power.js

  Runs shutdown, restart, and sleep commands for the agent web app.
*/

import { spawn } from "node:child_process";

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed with exit code ${code}`));
    });
  });
}

function getPowerCommand(action) {
  switch (process.platform) {
    // microslop
    case "win32":
      if (action === "shutdown") return { command: "shutdown", args: ["/s", "/t", "0"] };
      if (action === "restart") return { command: "shutdown", args: ["/r", "/t", "0"] };
      if (action === "sleep") {
        return {
          command: "rundll32.exe",
          args: ["powrprof.dll,SetSuspendState", "0,1,0"]
        };
      }
      break;
    // macos
    case "darwin":
      if (action === "shutdown") return { command: "sudo", args: ["shutdown", "-h", "now"] };
      if (action === "restart") return { command: "sudo", args: ["shutdown", "-r", "now"] };
      if (action === "sleep") return { command: "pmset", args: ["sleepnow"] };
      break;
    // default
    default:
      if (action === "shutdown") return { command: "systemctl", args: ["poweroff"] };
      if (action === "restart") return { command: "systemctl", args: ["reboot"] };
      if (action === "sleep") return { command: "systemctl", args: ["suspend"] };
      break;
  }

  throw new Error(`Unsupported action: ${action}`);
}

export async function runPowerAction(action) {
  const { command, args } = getPowerCommand(action);
  await runCommand(command, args);
}
