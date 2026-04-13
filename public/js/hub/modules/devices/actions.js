/*
  public/js/hub/modules/devices/actions.js

  Handles device actions, delete requests, busy state, and persisted order.
*/

import { capitalize } from "../../../shared/formatters.js";

// --------------------------------------------------------------------------
// Device actions
// --------------------------------------------------------------------------
export async function handleDeviceAction({ action, api, button, device, feedback, formatActionError }) {
  const row = button.closest(".device-row");
  if (!row) {
    return;
  }

  const status = row.querySelector(".device-status");
  const rowButtons = Array.from(row.querySelectorAll(".action-button"));
  setRowBusy(row, rowButtons, true);

  if ((document.documentElement.dataset.feedbackMode || "inline") === "inline") {
    feedback.setDeviceStatus(status, action === "wake" ? "Sending wake signal..." : `Sending ${action}...`, "pending");
    requestAnimationFrame(() => {
      status.dataset.visible = "true";
    });
  }

  try {
    await api(`/api/devices/${device.id}/${action}`, { method: "POST", body: "{}" });
    const message = action === "wake" ? `Wake signal sent to ${device.name}.` : `${capitalize(action)} sent to ${device.name}.`;
    feedback.reportFeedback(status, message, "success");
  } catch (error) {
    feedback.reportFeedback(status, formatActionError(error, device, action), "error");
  } finally {
    setRowBusy(row, rowButtons, false);
  }
}

export async function handleDeviceDelete({ api, device, deviceGrid, feedback, formatGlobalError, onLoadDevices }) {
  const row = deviceGrid.querySelector(`[data-device-id="${device.id}"]`);
  if (!row) {
    return;
  }

  const status = row.querySelector(".device-status");
  const rowButtons = Array.from(row.querySelectorAll(".action-button"));
  setRowBusy(row, rowButtons, true);

  if ((document.documentElement.dataset.feedbackMode || "inline") === "inline") {
    feedback.setDeviceStatus(status, `Deleting ${device.name}...`, "pending");
    requestAnimationFrame(() => {
      status.dataset.visible = "true";
    });
  }

  try {
    await api(`/api/devices/${device.id}`, { method: "DELETE" });
    await onLoadDevices();
    feedback.reportFeedback(status, `${device.name} was removed.`, "success");
  } catch (error) {
    feedback.reportFeedback(status, formatGlobalError(error), "error");
    setRowBusy(row, rowButtons, false);
  }
}

// --------------------------------------------------------------------------
// Persisted order
// --------------------------------------------------------------------------
export async function reorderDeviceView({ api, placement, scopeSpaceId, sourceId, targetId }) {
  await api("/api/devices/reorder", {
    method: "POST",
    body: JSON.stringify({
      sourceId,
      targetId,
      placement,
      scopeSpaceId
    })
  });
}

export function sortVisibleDevicesView({ currentOrders, devices, selectedSpace, spaceAll }) {
  const order = selectedSpace === spaceAll
    ? currentOrders.all || []
    : currentOrders.spaces?.[selectedSpace] || devices.map((device) => device.id);
  const indexById = new Map(order.map((id, index) => [id, index]));

  return [...devices].sort((left, right) => {
    const leftIndex = indexById.get(left.id);
    const rightIndex = indexById.get(right.id);

    if (leftIndex == null && rightIndex == null) return 0;
    if (leftIndex == null) return 1;
    if (rightIndex == null) return -1;
    return leftIndex - rightIndex;
  });
}

// --------------------------------------------------------------------------
// Row state
// --------------------------------------------------------------------------
export function setRowBusy(row, buttons, busy) {
  row.dataset.busy = String(busy);
  for (const actionButton of buttons) {
    actionButton.disabled = busy;
  }
}
