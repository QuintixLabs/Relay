/*
  public/js/hub/modules/devices/presence.js

  Handles rendered device presence state and row reflow animation.
*/

import { ICONS, OS_LABELS } from "../../../shared/constants.js";
import { setIcon } from "../../../shared/icons.js";

// --------------------------------------------------------------------------
// Presence and animation
// --------------------------------------------------------------------------
export function updateRenderedDeviceStatusesView({ currentDeviceStatuses, deviceGrid }) {
  for (const row of deviceGrid.querySelectorAll(".device-row")) {
    const deviceId = row.dataset.deviceId;
    const presence = row.querySelector(".device-presence");
    const presenceLabel = row.querySelector(".device-presence-label");
    const meta = row.querySelector(".device-meta");
    const icon = row.querySelector(".device-icon");
    const iconElement = icon?.querySelector(".device-os-icon");
    const status = currentDeviceStatuses[deviceId] || {};

    if (!deviceId || !presence || !presenceLabel) {
      continue;
    }

    if (status.os) {
      const os = String(status.os || "unknown").trim() || "unknown";
      row.dataset.deviceOs = os;

      if (icon && iconElement) {
        const iconName = ICONS[os] || ICONS.unknown;
        setIcon(iconElement, iconName);
        icon.classList.toggle("device-icon-macos", os === "macos");
      }
    }

    if (meta && status.host && status.port) {
      const os = row.dataset.deviceOs || "unknown";
      meta.textContent = `${OS_LABELS[os] || os} · ${status.host}:${status.port}`;
    }

    applyPresenceState(presence, presenceLabel, status.state || "unknown");
  }
}

export function applyPresenceState(element, labelElement, state) {
  element.dataset.state = state;
  labelElement.textContent =
    state === "online"
      ? "Online"
      : state === "offline"
        ? "Offline"
        : "";
}

export function captureDeviceRowRects(deviceGrid) {
  const rects = new Map();
  for (const row of deviceGrid.querySelectorAll(".device-row")) {
    rects.set(row.dataset.deviceId, row.getBoundingClientRect());
  }
  return rects;
}

export function animateDeviceGridReflow(deviceGrid, beforeRects) {
  for (const row of deviceGrid.querySelectorAll(".device-row")) {
    const previousRect = beforeRects.get(row.dataset.deviceId);
    if (!previousRect) {
      continue;
    }

    const nextRect = row.getBoundingClientRect();
    const deltaY = previousRect.top - nextRect.top;
    if (!deltaY) {
      continue;
    }

    row.animate(
      [
        { transform: `translateY(${deltaY}px)` },
        { transform: "translateY(0)" }
      ],
      {
        duration: 260,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)"
      }
    );
  }
}
