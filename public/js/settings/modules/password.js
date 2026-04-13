/*
  public/js/settings/modules/password.js

  Changes the saved instance password from the settings page.
*/

import { normalizeAuthErrorMessage } from "../../shared/formatters.js";
import { clearAuthToken } from "../../shared/storage.js";
import { bindDialog, clearModalFormError, showModalFormError } from "../../shared/modal.js";

// --------------------------------------------------------------------------
// Dialog setup
// --------------------------------------------------------------------------
export function initializePasswordSettings({
  cancelPasswordDialogButton,
  confirmPasswordInput,
  currentPasswordInput,
  openPasswordDialogButton,
  passwordDialogCopy,
  passwordDialog,
  passwordEnvNote,
  passwordFields,
  passwordForm,
  passwordMessage,
  passwordSubmitButton,
  nextPasswordInput
}) {
  if (!passwordForm || !passwordMessage || !passwordSubmitButton || !passwordDialog) {
    return;
  }

  const passwordDialogController = bindDialog(passwordDialog, null, cancelPasswordDialogButton);

  openPasswordDialogButton?.addEventListener("click", openPasswordDialog);
  passwordForm.addEventListener("input", () => clearModalFormError(passwordForm, passwordMessage));
  passwordForm.addEventListener("change", () => clearModalFormError(passwordForm, passwordMessage));
  passwordForm.addEventListener("submit", handlePasswordSubmit);

// ------------------------------------------------------------------------
// Dialog state helpers
// ------------------------------------------------------------------------
function resetPasswordDialogState() {
  clearModalFormError(passwordForm, passwordMessage);
  passwordForm.reset();

  restorePasswordDialog(passwordDialogCopy, passwordEnvNote, passwordFields, passwordMessage, passwordSubmitButton);
}

function applyEnvManagedState() {
  setEnvManagedCopy(passwordDialogCopy);

  if (passwordFields) {
    passwordFields.hidden = true;
  }

  if (passwordSubmitButton) {
    passwordSubmitButton.hidden = true;
  }

  passwordMessage.hidden = true;
}

// ------------------------------------------------------------------------
// Dialog open flow
// ------------------------------------------------------------------------
async function openPasswordDialog() {
  resetPasswordDialogState();

  const settings = await loadSettings();
  if (settings.passwordManagedByEnv) {
    applyEnvManagedState();
  }

  passwordDialog.showModal();
}

// ------------------------------------------------------------------------
// Submit flow
// ------------------------------------------------------------------------
async function handlePasswordSubmit(event) {
  event.preventDefault();

  passwordSubmitButton.disabled = true;

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
      body: JSON.stringify({
        confirmPassword: confirmPasswordInput?.value.trim() || "",
        currentPassword: currentPasswordInput?.value.trim() || "",
        nextPassword: nextPasswordInput?.value.trim() || ""
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(normalizePasswordError(payload.error || `Request failed with ${response.status}`));
    }

    passwordDialogController.close();
    clearAuthToken();
    window.location.replace("/");
  } catch (error) {
    showModalFormError(passwordForm, passwordMessage, normalizePasswordError(error, "Couldn't change password."));
  } finally {
    passwordSubmitButton.disabled = false;
  }
}
}

// --------------------------------------------------------------------------
// Shared helpers
// --------------------------------------------------------------------------
function normalizePasswordError(error, fallback = undefined) {
  return normalizeAuthErrorMessage(error instanceof Error ? error : new Error(String(error)), fallback);
}

async function loadSettings() {
  try {
    const response = await fetch("/api/settings", { credentials: "same-origin" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(normalizePasswordError(payload.error || `Request failed with ${response.status}`));
    }

    return payload.settings || {};
  } catch {
    return {};
  }
}

function setEnvManagedCopy(copyElement) {
  if (!copyElement) {
    return;
  }

  copyElement.textContent = "This instance is using a password from the ";

  const strong = document.createElement("strong");
  strong.textContent = ".env";
  copyElement.append(strong, " file. Change it there and restart your instance.");
}

function restorePasswordDialog(copyElement, noteElement, fieldsElement, messageElement, submitButton) {
  if (copyElement) {
    copyElement.textContent = "Update the saved password for this instance.";
  }

  if (noteElement) {
    noteElement.hidden = true;
  }

  if (fieldsElement) {
    fieldsElement.hidden = false;
  }

  if (messageElement) {
    messageElement.hidden = false;
  }

  if (submitButton) {
    submitButton.hidden = false;
  }
}
