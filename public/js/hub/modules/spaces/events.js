/*
  public/js/hub/modules/spaces/events.js

  Handles add, edit, and delete submits for spaces.
*/

import { normalizeAuthErrorMessage } from "../../../shared/formatters.js";

export function bindSpaceEvents({
  api,
  clearModalFormError,
  feedback,
  loadDevices,
  selectSpaceStorageKey,
  setStoredValue,
  showModalFormError,
  spaceDeleteDialogController,
  spaceDeleteForm,
  spaceDialogController,
  spaceForm,
  spaceFormMessage,
  spaceNameInput,
  spaceStatus,
  state,
  spaceAll
}) {
  spaceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = spaceNameInput.value.trim();

    try {
      if (state.editingSpaceTarget) {
        await api(`/api/spaces/${state.editingSpaceTarget.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name })
        });
      } else {
        await api("/api/spaces", {
          method: "POST",
          body: JSON.stringify({ name })
        });
      }

      const wasEditing = Boolean(state.editingSpaceTarget);
      state.editingSpaceTarget = null;
      spaceDialogController.close();
      clearModalFormError(spaceForm, spaceFormMessage);
      await loadDevices();
      feedback.reportFeedback(spaceStatus, wasEditing ? `${name} was updated.` : `${name} was added.`, "success");
    } catch (error) {
      showModalFormError(spaceForm, spaceFormMessage, normalizeAuthErrorMessage(error, error.message));
    }
  });

  spaceDeleteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.deleteSpaceTarget) {
      return;
    }

    const target = state.deleteSpaceTarget;
    state.deleteSpaceTarget = null;
    spaceDeleteDialogController.close();

    try {
      await api(`/api/spaces/${target.id}`, { method: "DELETE" });
      if (state.selectedSpace === target.id) {
        state.selectedSpace = spaceAll;
        setStoredValue(selectSpaceStorageKey, state.selectedSpace);
      }
      await loadDevices();
      feedback.reportFeedback(spaceStatus, `${target.name} was removed.`, "success");
    } catch (error) {
      feedback.reportFeedback(spaceStatus, normalizeAuthErrorMessage(error, error.message), "error");
    }
  });
}
