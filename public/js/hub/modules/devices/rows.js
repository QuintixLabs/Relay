/*
  public/js/hub/modules/devices/rows.js

  Renders device rows and binds per-row UI behavior.
*/

import { ICONS, OS_LABELS } from "../../../shared/constants.js";
import { capitalize } from "../../../shared/formatters.js";
import { createIcon, iconMarkup, setIcon } from "../../../shared/icons.js";
import { bindRowDragInteractions } from "./drag.js";
import { applyPresenceState } from "./presence.js";

// --------------------------------------------------------------------------
// Device rendering
// --------------------------------------------------------------------------
export function renderDevicesView({
  fetchDeviceForConfig,
  currentDeviceStatuses,
  deviceRowCache,
  deviceCountValue,
  deviceGrid,
  deviceTemplate,
  devices,
  emptyMessage = "No devices found.",
  feedback,
  getDragState,
  getSpaceLabel,
  onAction,
  onDelete,
  onEdit,
  onOpenAssignSpace,
  onReorderDevice,
  setDragState
}) {
  deviceCountValue.textContent = `${devices.length} ${devices.length === 1 ? "device" : "devices"}`;
  const rowCache = deviceRowCache instanceof Map ? deviceRowCache : new Map();
  const nextRows = [];
  const renderedOrder = [];

  for (const emptyState of deviceGrid.querySelectorAll(".device-empty")) {
    emptyState.remove();
  }

  for (const row of rowCache.values()) {
    row.hidden = true;
    row.style.display = "none";
  }

  for (const [index, device] of devices.entries()) {
    const deviceId = String(device.id);
    const row = rowCache.get(deviceId) || createDeviceRow(deviceTemplate);

    updateDeviceRow({
      currentDeviceStatuses,
      device,
      deviceGrid,
      feedback,
      fetchDeviceForConfig,
      getDragState,
      getSpaceLabel,
      onAction,
      onDelete,
      onEdit,
      onOpenAssignSpace,
      onReorderDevice,
      row,
      setDragState
    });

    rowCache.set(deviceId, row);
    row.hidden = false;
    row.style.display = "";
    row.style.order = String(index);
    nextRows.push(row);
    renderedOrder.push({
      id: String(device.id),
      name: device.name,
      host: device.host,
      port: String(device.port),
      row
    });
  }

  if (devices.length === 0) {
    deviceGrid.append(createEmptyState(emptyMessage));
    return {
      rows: new Map(),
      order: []
    };
  }

  deviceGrid.append(...nextRows);
  return {
    rows: new Map(nextRows.map((row) => [row.dataset.deviceId, row])),
    order: renderedOrder
  };
}

function createEmptyState(emptyMessage = "No devices found.") {
  const emptyState = document.createElement("div");
  emptyState.className = "device-empty";
  emptyState.textContent = emptyMessage;
  return emptyState;
}

function createDeviceRow(deviceTemplate) {
  return deviceTemplate.content.firstElementChild.cloneNode(true);
}

function downloadDeviceConfig(device) {
  const payload = {
    hubUrl: String(device.hubUrl || window.location.origin).trim(),
    deviceId: String(device.deviceId || device.id || "").trim(),
    deviceName: String(device.deviceName || device.name || "").trim(),
    token: String(device.token || "").trim(),
    os: String(device.os || "unknown").trim() || "unknown"
  };
  const fileName = `${payload.deviceId || "relay-agent"}-config.json`;
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

function renderAction(device, action, label, icon, subtle, onAction) {
  const button = document.createElement("button");
  button.type = "button";
  const classes = ["action-button"];

  if (action === "wake" || action === "shutdown") {
    classes.push("primary");
  } else if (subtle) {
    classes.push("subtle");
  }

  button.className = classes.join(" ");
  button.innerHTML = `${iconMarkup(icon)}<span>${label}</span>`;
  button.addEventListener("click", () => onAction(device, action, button));
  return button;
}

function updateDeviceRow({
  currentDeviceStatuses,
  device,
  deviceGrid,
  feedback,
  fetchDeviceForConfig,
  getDragState,
  getSpaceLabel,
  onAction,
  onDelete,
  onEdit,
  onOpenAssignSpace,
  onReorderDevice,
  row,
  setDragState
}) {
  const name = row.querySelector(".device-name");
  const meta = row.querySelector(".device-meta");
  const presence = row.querySelector(".device-presence");
  const presenceLabel = row.querySelector(".device-presence-label");
  const icon = row.querySelector(".device-icon");
  let iconElement = icon.querySelector(".device-os-icon");
  const buttonGrid = row.querySelector(".button-grid");
  const status = row.querySelector(".device-status");
  const rowDownloadTrigger = row.querySelector(".row-download-trigger");
  const rowDragHandle = row.querySelector(".row-drag-handle");
  const rowEditTrigger = row.querySelector(".row-edit-trigger");
  const rowDeleteTrigger = row.querySelector(".row-delete-trigger");
  const spacePill = row.querySelector(".device-space-pill");
  let spacePillIcon = spacePill.querySelector(".icon");
  const spacePillLabel = spacePill.querySelector("span:not(.icon)");

  row.dataset.deviceId = String(device.id);
  row.dataset.deviceOs = String(device.os || "");
  row.dataset.busy = "false";
  name.textContent = device.name;
  meta.textContent = `${OS_LABELS[device.os] || device.os} · ${device.host}:${device.port}`;
  applyPresenceState(presence, presenceLabel, currentDeviceStatuses[device.id]?.state || "unknown");

  const iconName = ICONS[device.os] || ICONS.unknown;
  if (!iconElement) {
    iconElement = createIcon(iconName, "device-os-icon");
    icon.replaceChildren(iconElement);
  }
  setIcon(iconElement, iconName);
  icon.classList.toggle("device-icon-macos", device.os === "macos");

  if (!spacePillIcon) {
    spacePillIcon = createIcon("relay:panels-top-left");
    spacePill.prepend(spacePillIcon);
  }
  setIcon(spacePillIcon, "relay:panels-top-left");

  spacePillLabel.textContent = getSpaceLabel(device.spaceId);
  spacePill.onclick = () => onOpenAssignSpace(device);
  rowDownloadTrigger.onclick = async () => {
    try {
      const deviceForConfig =
        typeof fetchDeviceForConfig === "function"
          ? await fetchDeviceForConfig(device)
          : device;

      if (!deviceForConfig) {
        return;
      }

      downloadDeviceConfig(deviceForConfig);
    } catch (error) {
      feedback.reportFeedback(status, error.message || "Couldn't download the device config.", "error");
    }
  };

  const actionSignature = JSON.stringify({
    actions: device.actions || [],
    hasWake: device.hasWake
  });
  if (buttonGrid.dataset.signature !== actionSignature) {
    buttonGrid.innerHTML = "";

    if (device.hasWake) {
      buttonGrid.appendChild(renderAction(device, "wake", "Wake", "relay:zap", false, onAction));
    }

    for (const action of device.actions || []) {
      const label = capitalize(action);
      const buttonIcon =
        action === "shutdown"
          ? "relay:power"
          : action === "restart"
            ? "relay:rotate-cw"
            : "relay:moon-star";
      buttonGrid.appendChild(renderAction(device, action, label, buttonIcon, action !== "shutdown", onAction));
    }

    buttonGrid.dataset.signature = actionSignature;
  }

  for (const actionButton of row.querySelectorAll(".action-button")) {
    actionButton.disabled = false;
  }

  bindRowDragInteractions({
    device,
    deviceGrid,
    getDragState,
    onReorderDevice,
    row,
    rowDragHandle,
    setDragState
  });

  feedback.clearDeviceStatus(status);
  rowEditTrigger.onclick = () => onEdit(device);
  rowDeleteTrigger.onclick = () => onDelete(device);
}
