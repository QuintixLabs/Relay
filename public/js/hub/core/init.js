/*
  public/js/hub/core/init.js

  Wires Hub modules, dialogs, and remaining page behavior.
*/

import { createDeviceFormController } from "../modules/devices/form.js";
import { bindDeviceEvents } from "../modules/devices/events.js";
import { bindSpaceEvents } from "../modules/spaces/events.js";
import { bindDialog, clearModalFormError, showModalFormError } from "../../shared/modal.js";
import { setIcon } from "../../shared/icons.js";
import { bindHubAuth } from "../modules/shell/auth.js";
import { bindMenuTrigger } from "../modules/shell/menu.js";
import { bindDeviceSearch } from "../modules/shell/search.js";
import { bindSidebarShell } from "../modules/shell/sidebar.js";

export function initializeHub({
  // Top bar and shell.
  addDeviceButton,
  addSpaceButton,
  applyCurrentSidebarState,
  closeSidebarButton,
  closeDeviceSearchButton,
  deviceSearchDialog,
  deviceSearchResults,
  deviceSearchTrigger,
  menuController,
  menuTrigger,
  sidebarScrim,
  sidebarToggle,
  spaceStatus,
  toggleTokenButton,

  // Login.
  auth,
  clearAuthToken,
  forgetButton,
  rememberDeviceInput,
  setupConfirmInput,
  tokenInput,
  tokenForm,
  toggleSetupConfirmButton,

  // Shared page state and helpers.
  api,
  appState,
  feedback,
  isMobileLayout,
  jumpToDevice,
  loadDevices,
  maxSpaces,
  deviceSearchInput,
  openSpaceDialog,
  selectSpaceStorageKey,
  setStoredValue,
  sidebarStateStorageKey,
  spaceAll,
  syncCurrentSidebarStateForViewport,

  // Add device.
  deviceDialog,
  deviceForm,
  deviceDialogCopy,
  deviceDialogTitle,
  cancelDeviceFormButton,
  deviceFormMessage,
  deviceSubmitButton,
  toggleDeviceTokenButton,
  unlockDeviceTokenWrap,
  unlockDeviceTokenButton,
  deviceSecretDialog,
  deviceSecretForm,
  deviceSecretTitle,
  deviceSecretCopy,
  deviceSecretPasswordInput,
  toggleDeviceSecretPasswordButton,
  deviceSecretMessage,
  cancelDeviceSecretButton,

  // Device delete flow.
  cancelDeleteButton,
  deleteDialog,
  deleteForm,
  handleDelete,
  deviceGrid,

  // Spaces.
  assignSpaceDialog,
  assignSpaceForm,
  assignSpaceMessage,
  cancelAssignSpaceButton,
  cancelSpaceButton,
  cancelSpaceDeleteButton,
  spaceDeleteDialog,
  spaceDeleteForm,
  spaceDialog,
  spaceForm,
  spaceFormMessage,
  spaceNameInput,
}) {
  const { initialLoadPromise } = bindHubAuth({
    appState,
    auth,
    clearAuthToken,
    clearSearch() {
      if (deviceSearchInput) {
        deviceSearchInput.value = "";
      }
      appState.commandSearchQuery = "";
    },
    deviceGrid,
    forgetButton,
    loadDevices,
    rememberDeviceInput,
    setupConfirmInput,
    spaceAll,
    tokenInput,
    tokenForm,
    toggleSetupConfirmButton,
    toggleTokenButton
  });

bindMenuTrigger({
  menuController,
  menuTrigger
});

bindSidebarShell({
  appState,
  applyCurrentSidebarState,
  closeSidebarButton,
  isMobileLayout,
  setStoredValue,
  sidebarScrim,
  sidebarStateStorageKey,
  sidebarToggle,
  syncCurrentSidebarStateForViewport
});

bindDeviceSearch({
  appState,
  closeButton: closeDeviceSearchButton,
  dialog: deviceSearchDialog,
  input: deviceSearchInput,
  jumpToDevice,
  results: deviceSearchResults,
  trigger: deviceSearchTrigger
});

// --------------------------------------------------------------------------
// Dialog controllers
// --------------------------------------------------------------------------
const deviceSecretDialogController = bindDialog(deviceSecretDialog, null, cancelDeviceSecretButton);
const toggleDeviceSecretPasswordIcon = toggleDeviceSecretPasswordButton?.querySelector(".icon");

deviceSecretForm.addEventListener("input", () => {
  clearModalFormError(deviceSecretForm, deviceSecretMessage);
});

deviceSecretForm.addEventListener("change", () => {
  clearModalFormError(deviceSecretForm, deviceSecretMessage);
});

function resetDeviceSecretPasswordVisibility() {
  deviceSecretPasswordInput.type = "password";

  if (toggleDeviceSecretPasswordIcon) {
    setIcon(toggleDeviceSecretPasswordIcon, "relay:eye");
  }
}

async function requestDevicePassword({
  title = "Confirm your password",
  message = "Enter your current Hub password to continue.",
  confirmAction
} = {}) {
  return new Promise((resolve, reject) => {
    deviceSecretTitle.textContent = title;
    deviceSecretCopy.textContent = message;
    clearModalFormError(deviceSecretForm, deviceSecretMessage);
    deviceSecretForm.reset();
    resetDeviceSecretPasswordVisibility();

    const handleSubmit = async (event) => {
      event.preventDefault();
      const password = String(deviceSecretPasswordInput.value || "").trim();

      if (!password) {
        showModalFormError(deviceSecretForm, deviceSecretMessage, "Enter your current password.");
        return;
      }

      try {
        const result = typeof confirmAction === "function" ? await confirmAction(password) : password;
        cleanup();
        deviceSecretDialogController.close();
        resolve(result);
      } catch (error) {
        showModalFormError(deviceSecretForm, deviceSecretMessage, error.message || "Couldn't verify your password.");
      }
    };

    const handleClose = () => {
      cleanup();
      reject(new Error("Password confirmation was cancelled."));
    };

    function cleanup() {
      deviceSecretForm.removeEventListener("submit", handleSubmit);
      deviceSecretDialog.removeEventListener("close", handleClose);
    }

    deviceSecretForm.addEventListener("submit", handleSubmit);
    deviceSecretDialog.addEventListener("close", handleClose, { once: true });
    deviceSecretDialog.showModal();
    requestAnimationFrame(() => {
      deviceSecretPasswordInput.focus();
    });
  });
}

toggleDeviceSecretPasswordButton?.addEventListener("click", () => {
  const hidden = deviceSecretPasswordInput.type === "password";
  deviceSecretPasswordInput.type = hidden ? "text" : "password";

  if (toggleDeviceSecretPasswordIcon) {
    setIcon(toggleDeviceSecretPasswordIcon, hidden ? "relay:eye-off" : "relay:eye");
  }
});

const deviceFormController = createDeviceFormController({
  dialog: deviceDialog,
  form: deviceForm,
  openButton: addDeviceButton,
  closeButton: null,
  cancelButton: cancelDeviceFormButton,
  copy: deviceDialogCopy,
  message: deviceFormMessage,
  submitButton: deviceSubmitButton,
  toggleTokenButton: toggleDeviceTokenButton,
  unlockTokenWrap: unlockDeviceTokenWrap,
  unlockTokenButton: unlockDeviceTokenButton,
  title: deviceDialogTitle,
  getSpaces: () => appState.currentSpaces,
  requestDevicePassword,
  onSubmit: async (payload, editingDeviceId) => {
    const isEditing = Boolean(editingDeviceId);
    const response = await api(isEditing ? `/api/devices/${editingDeviceId}` : "/api/devices", {
      method: isEditing ? "PATCH" : "POST",
      body: JSON.stringify(payload)
    });

    const savedDevice = response?.device || null;
    if (savedDevice?.id) {
      appState.pendingDeviceFeedback = {
        deviceId: String(savedDevice.id),
        message: isEditing ? `${savedDevice.name} was updated.` : `${savedDevice.name} was added.`,
        tone: "success"
      };
    } else {
      feedback.reportFeedback(spaceStatus, isEditing ? "Device updated." : "Device added.", "success");
    }

    await loadDevices();
  }
});

const deleteDialogController = bindDialog(deleteDialog, null, cancelDeleteButton);
const spaceDialogController = bindDialog(spaceDialog, null, cancelSpaceButton);
const spaceDeleteDialogController = bindDialog(spaceDeleteDialog, null, cancelSpaceDeleteButton);
const assignSpaceDialogController = bindDialog(assignSpaceDialog, null, cancelAssignSpaceButton);

// --------------------------------------------------------------------------
// Space events
// --------------------------------------------------------------------------
addSpaceButton.addEventListener("click", () => {
  if (appState.currentSpaces.length >= maxSpaces) {
    feedback.reportFeedback(spaceStatus, `You can create up to ${maxSpaces} spaces.`, "error");
    return;
  }

  openSpaceDialog();
});

spaceForm.addEventListener("input", () => clearModalFormError(spaceForm, spaceFormMessage));
spaceForm.addEventListener("change", () => clearModalFormError(spaceForm, spaceFormMessage));
assignSpaceForm.addEventListener("input", () => clearModalFormError(assignSpaceForm, assignSpaceMessage));
assignSpaceForm.addEventListener("change", () => clearModalFormError(assignSpaceForm, assignSpaceMessage));

bindSpaceEvents({
  api,
  clearModalFormError,
  feedback,
  loadDevices,
  onOpenSpaceDialog: openSpaceDialog,
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
  state: appState,
  spaceAll
});

// --------------------------------------------------------------------------
// Device events
// --------------------------------------------------------------------------
bindDeviceEvents({
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
  state: appState
});

return {
  deviceFormController,
  requestDevicePassword,
  initialLoadPromise
};
}
