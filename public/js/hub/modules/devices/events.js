/*
  public/js/hub/modules/devices/events.js

  Handles device delete and move-to-space form submits.
*/

import { NO_SPACE_LABEL } from "../spaces/base.js";

export function bindDeviceEvents({
  api,
  assignSpaceDialogController,
  assignSpaceForm,
  assignSpaceMessage,
  clearModalFormError,
  deleteDialogController,
  deleteForm,
  feedback,
  handleDelete,
  loadDevices,
  showModalFormError,
  spaceStatus,
  state
}) {
  assignSpaceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.assignSpaceTarget) {
      return;
    }

    const formData = new FormData(assignSpaceForm);
    const spaceId = String(formData.get("spaceId") || "").trim() || null;
    clearModalFormError(assignSpaceForm, assignSpaceMessage);

    try {
      await api(`/api/devices/${state.assignSpaceTarget.id}/space`, {
        method: "PATCH",
        body: JSON.stringify({ spaceId })
      });

      const deviceName = state.assignSpaceTarget.name;
      const label = spaceId ? state.currentSpaces.find((space) => space.id === spaceId)?.name || "space" : NO_SPACE_LABEL;
      state.assignSpaceTarget = null;
      assignSpaceDialogController.close();
      await loadDevices();
      feedback.reportFeedback(spaceStatus, `${deviceName} moved to ${label}.`, "success");
    } catch (error) {
      showModalFormError(assignSpaceForm, assignSpaceMessage, error.message);
    }
  });

  deleteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.deleteTarget) {
      return;
    }

    const target = state.deleteTarget;
    state.deleteTarget = null;
    deleteDialogController.close();
    await handleDelete(target);
  });
}
