/*
  public/js/settings/modules/backup.js

  Handles backup export and import from the settings page.
*/

import { normalizeAuthErrorMessage } from "../../shared/formatters.js";
import { bindDialog, clearModalFormError, showModalFormError, showNoticeDialog } from "../../shared/modal.js";

async function parseJsonResponse(response) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  return payload;
}

function downloadBackupFile(backup) {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], {
    type: "application/json"
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = href;
  link.download = `relay-backup-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function showBackupError(title, error) {
  showNoticeDialog({
    title,
    message: normalizeAuthErrorMessage(error, "Try again.")
  });
}

// --------------------------------------------------------------------------
// Export flow
// --------------------------------------------------------------------------
async function exportBackup(password) {
  const response = await fetch("/api/backup/export", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  });
  const payload = await parseJsonResponse(response);

  downloadBackupFile(payload.backup || {});
}

// --------------------------------------------------------------------------
// Import flow
// --------------------------------------------------------------------------
async function importBackupFile(file) {
  const text = await file.text();
  const backup = JSON.parse(text);
  const response = await fetch("/api/backup/import", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(backup)
  });

  await parseJsonResponse(response);
}

export function initializeBackupSettings({
  backupPasswordDialog,
  backupPasswordForm,
  backupPasswordInput,
  backupPasswordMessage,
  backupPasswordSubmitButton,
  cancelBackupPasswordDialogButton,
  exportBackupButton,
  importBackupButton,
  importBackupInput
}) {
  const backupPasswordDialogController = bindDialog(
    backupPasswordDialog,
    null,
    cancelBackupPasswordDialogButton
  );

  backupPasswordForm?.addEventListener("input", () => clearModalFormError(backupPasswordForm, backupPasswordMessage));
  backupPasswordForm?.addEventListener("change", () => clearModalFormError(backupPasswordForm, backupPasswordMessage));

  // Export button
  exportBackupButton?.addEventListener("click", async () => {
    clearModalFormError(backupPasswordForm, backupPasswordMessage);
    backupPasswordForm?.reset();
    backupPasswordDialog?.showModal();
  });

  backupPasswordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    backupPasswordSubmitButton.disabled = true;

    try {
      await exportBackup(backupPasswordInput?.value.trim() || "");
      backupPasswordDialogController.close();
    } catch (error) {
      showModalFormError(
        backupPasswordForm,
        backupPasswordMessage,
        normalizeAuthErrorMessage(error, "Couldn't export backup.")
      );
    } finally {
      backupPasswordSubmitButton.disabled = false;
    }
  });

  // Open file picker (Import button)
  importBackupButton?.addEventListener("click", () => {
    importBackupInput?.click();
  });

  // Import selected file
  importBackupInput?.addEventListener("change", async () => {
    const file = importBackupInput.files?.[0];

    if (!file) {
      return;
    }

    try {
      await importBackupFile(file);
      window.location.replace("/");
    } catch (error) {
      showBackupError("Couldn't import backup", error);
    } finally {
      importBackupInput.value = "";
    }
  });
}
