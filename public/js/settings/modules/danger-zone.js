/*
  public/js/settings/modules/reset.js

  Handles the danger-zone reset flow for Relay settings.
*/

import { normalizeAuthErrorMessage } from "../../shared/formatters.js";
import { bindDialog, clearModalFormError, showModalFormError } from "../../shared/modal.js";

export function initializeResetSettings({
  cancelResetDialogButton,
  openResetDialogButton,
  resetConfirmInput,
  resetDialog,
  resetForm,
  resetMessage,
  resetSubmitButton
}) {
  if (!resetDialog || !resetForm || !resetMessage || !resetSubmitButton) {
    return;
  }

  const resetDialogController = bindDialog(resetDialog, null, cancelResetDialogButton);

  function syncResetSubmitState() {
    resetSubmitButton.disabled = String(resetConfirmInput?.value || "").trim() !== "DELETE";
  }

  openResetDialogButton?.addEventListener("click", () => {
    resetForm.reset();
    clearModalFormError(resetForm, resetMessage);
    syncResetSubmitState();
    resetDialog.showModal();
  });

  resetForm.addEventListener("input", () => {
    clearModalFormError(resetForm, resetMessage);
    syncResetSubmitState();
  });
  resetForm.addEventListener("change", () => clearModalFormError(resetForm, resetMessage));

  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    resetSubmitButton.disabled = true;

    try {
      const confirm = String(resetConfirmInput?.value || "").trim();
      const response = await fetch("/api/reset", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ confirm })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(normalizeAuthErrorMessage(new Error(payload.error || `Request failed with ${response.status}`)));
      }

      resetDialogController.close();
      window.location.replace("/");
    } catch (error) {
      showModalFormError(
        resetForm,
        resetMessage,
        normalizeAuthErrorMessage(error, "Couldn't reset Relay data.")
      );
    } finally {
      resetSubmitButton.disabled = false;
    }
  });
}
