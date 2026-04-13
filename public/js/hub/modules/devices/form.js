/*
  public/js/hub/modules/devices/form.js

  Runs the add-device form and its modal behavior.
*/

import { enhanceDialog } from "../../../shared/dialogs.js";
import { setIcon } from "../../../shared/icons.js";

export function createDeviceFormController({
  // Dialog shell.
  dialog,
  form,
  cancelButton,
  closeButton,
  openButton,

  // Form feedback and actions.
  copy,
  message,
  submitButton,
  toggleTokenButton,
  unlockTokenWrap,
  unlockTokenButton,
  title,

  // Data.
  getSpaces,
  requestDevicePassword,
  onSubmit
}) {

let editingDeviceId = null;
let revealedStoredToken = "";
let tokenUnlockedForEdit = false;

// dialog behavior
function shouldLockScroll() {
  return true;
}

function sanitizeTokenInput() {
  const tokenInput = form.elements.token;

  if (!tokenInput) {
    return;
  }

  const rawValue = String(tokenInput.value || "");
  const cleanValue = rawValue.replace(/\s+/g, "");

  if (rawValue === cleanValue) {
    return;
  }

  const selectionStart = tokenInput.selectionStart ?? cleanValue.length;
  const removedBeforeCursor = rawValue.slice(0, selectionStart).length - rawValue.slice(0, selectionStart).replace(/\s+/g, "").length;

  tokenInput.value = cleanValue;

  const nextCursor = Math.max(0, selectionStart - removedBeforeCursor);
  tokenInput.setSelectionRange(nextCursor, nextCursor);
}

function syncSpaceOptions(selectedSpaceId = "") {
  if (typeof getSpaces !== "function" || !form.elements.spaceId) {
    return;
  }

  const spaces = getSpaces() || [];
  const select = form.elements.spaceId;
  select.replaceChildren();

  const allDevicesOption = document.createElement("option");
  allDevicesOption.value = "";
  allDevicesOption.textContent = "All devices";
  select.append(allDevicesOption);

  for (const space of spaces) {
    const option = document.createElement("option");
    option.value = space.id;
    option.textContent = space.name;
    select.append(option);
  }

  select.value = selectedSpaceId;
}

function syncActions(actions = ["shutdown", "restart", "sleep"]) {
  const enabledActions = new Set(actions);
  form.querySelectorAll('input[name="actions"]').forEach((input) => {
    input.checked = enabledActions.has(input.value);
  });
}

// ------------------------------------------------------------------------
// Form feedback
// ------------------------------------------------------------------------
function clearFormError() {
  form.dataset.hasError = "false";
  message.textContent = "";
  message.dataset.visible = "false";
}

function showFormError(text) {
  form.dataset.hasError = "true";
  message.textContent = text;
  message.dataset.visible = "false";
  message.getBoundingClientRect();
  requestAnimationFrame(() => {
    message.dataset.visible = "true";
  });
}

function isPasswordConfirmMessage(text) {
  const message = String(text || "").trim().toLowerCase();
  return (
    message === "current password is wrong." ||
    message === "enter your current password." ||
    message === "couldn't verify your password."
  );
}

const dialogController = enhanceDialog(dialog, { shouldLockScroll });
const toggleTokenIcon = toggleTokenButton.querySelector(".icon");

// ------------------------------------------------------------------------
// Field state helpers
// ------------------------------------------------------------------------
function resetTokenVisibility() {
  form.elements.token.type = "password";
  delete form.elements.token.dataset.revealed;
  revealedStoredToken = "";
  tokenUnlockedForEdit = false;
  if (toggleTokenIcon) {
    setIcon(toggleTokenIcon, "relay:eye");
  }
}

function setTokenInputLocked(locked) {
  const tokenWrap = form.elements.token.closest(".device-token-wrap");
  form.elements.token.readOnly = locked;
  form.elements.token.disabled = false;
  if (locked) {
    form.elements.token.blur();
  }

  if (tokenWrap) {
    tokenWrap.dataset.locked = locked ? "true" : "false";
  }
}

// ------------------------------------------------------------------------
// Dialog open helpers
// ------------------------------------------------------------------------
function openCreate() {
  editingDeviceId = null;
  clearFormError();
  form.dataset.mode = "create";
  form.reset();
  syncSpaceOptions("");
  syncActions();
  form.elements.token.placeholder = "Device Agent Token";
  form.elements.token.required = true;
  setTokenInputLocked(false);
  unlockTokenWrap.hidden = true;
  form.elements.mac.placeholder = "AA:BB:CC:DD:EE:FF";
  form.elements.wolHost.placeholder = "192.168.1.255";
  form.elements.wolPort.placeholder = "9";
  resetTokenVisibility();
  title.textContent = "Add device";
  copy.textContent = "Save a machine to your hub.";
  submitButton.textContent = "Save device";
  dialog.showModal();
}

function openEdit(device) {
  editingDeviceId = device.id;
  clearFormError();
  form.dataset.mode = "edit";
  form.elements.name.value = device.name || "";
  form.elements.host.value = device.host || "";
  form.elements.token.value = "";
  form.elements.token.placeholder = "Current token hidden";
  form.elements.token.required = false;
  setTokenInputLocked(true);
  unlockTokenWrap.hidden = false;
  form.elements.mac.value = device.mac || "";
  form.elements.mac.placeholder = "AA:BB:CC:DD:EE:FF";
  form.elements.wolHost.value = device.wolHost || "";
  form.elements.wolHost.placeholder = "192.168.1.255";
  form.elements.wolPort.value =
    device.wolPortExplicit && Number(device.wolPort || 0) > 0
      ? String(device.wolPort)
      : "";
  form.elements.wolPort.placeholder = "9";
  syncSpaceOptions(device.spaceId || "");
  syncActions(device.actions?.length ? device.actions : []);
  resetTokenVisibility();
  title.textContent = "Edit device";
  copy.textContent = `Update ${device.name}.`;
  submitButton.textContent = "Save changes";
  dialog.showModal();
}

// ------------------------------------------------------------------------
// Form events
// ------------------------------------------------------------------------
openButton.addEventListener("click", openCreate);

form.addEventListener("input", clearFormError);
form.addEventListener("change", clearFormError);
form.elements.token.addEventListener("input", sanitizeTokenInput);

toggleTokenButton.addEventListener("click", async () => {
  const hidden = form.elements.token.type === "password";

  if (!hidden) {
    form.elements.token.type = "password";

    if (editingDeviceId && form.elements.token.value === revealedStoredToken) {
      form.elements.token.value = "";
      revealedStoredToken = "";
      delete form.elements.token.dataset.revealed;
    }
  } else {
    const tokenInput = form.elements.token;
    const hasTypedValue = Boolean(String(tokenInput.value || "").trim());

    if (editingDeviceId && !tokenUnlockedForEdit && !hasTypedValue && typeof requestDevicePassword === "function") {
      try {
        const token = await requestDevicePassword({
          title: "Reveal device token",
          message: "Enter your current Hub password to reveal this device token.",
          confirmAction: async (password) => {
            const response = await fetch(`/api/devices/${editingDeviceId}/token`, {
              method: "POST",
              credentials: "same-origin",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ password })
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(payload.error || `Request failed with ${response.status}`);
            }

            return String(payload.token || "");
          }
        });
        revealedStoredToken = token;
        tokenInput.value = revealedStoredToken;
        tokenInput.dataset.revealed = "true";
      } catch (error) {
        clearFormError();
        return;
      }
    }

    form.elements.token.type = "text";
  }

  if (toggleTokenIcon) {
    setIcon(toggleTokenIcon, hidden ? "relay:eye-off" : "relay:eye");
  }
});

unlockTokenButton?.addEventListener("click", async () => {
  if (!editingDeviceId || typeof requestDevicePassword !== "function") {
    return;
  }

  try {
    await requestDevicePassword({
      title: "Change device token",
      message: "Enter your current Hub password to change this device token.",
      confirmAction: async (password) => {
        const response = await fetch(`/api/devices/${editingDeviceId}/authorize`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ password })
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || `Request failed with ${response.status}`);
        }
      }
    });
  } catch {
    clearFormError();
    return;
  }

  tokenUnlockedForEdit = true;
  revealedStoredToken = "";
  form.elements.token.value = "";
  form.elements.token.type = "password";
  form.elements.token.placeholder = "Enter a new token";
  form.elements.token.required = true;
  delete form.elements.token.dataset.revealed;
  setTokenInputLocked(false);
  form.elements.token.focus();
  if (toggleTokenIcon) {
    setIcon(toggleTokenIcon, "relay:eye");
  }
});

closeButton?.addEventListener("click", () => dialogController.close());
cancelButton.addEventListener("click", () => dialogController.close());

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    dialogController.close();
  }
});

// ------------------------------------------------------------------------
// Submit
// ------------------------------------------------------------------------
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const tokenInput = form.elements.token;
  const tokenValue = String(tokenInput.value || "");

  if (
    (!editingDeviceId || tokenUnlockedForEdit || tokenValue) &&
    (tokenValue.length < 8 || tokenValue.length > 128 || /\s/.test(tokenValue))
  ) {
    showFormError("Agent token must be 8 to 128 characters and cannot contain spaces");
    return;
  }

  const formData = new FormData(form);
  const payload = {
    name: formData.get("name"),
    host: formData.get("host"),
    token: formData.get("token"),
    spaceId: formData.get("spaceId"),
    actions: formData.getAll("actions"),
    mac: formData.get("mac"),
    wolHost: formData.get("wolHost"),
    wolPort: formData.get("wolPort")
  };

  try {
    await onSubmit(payload, editingDeviceId);
    dialogController.close();
  } catch (error) {
    if (isPasswordConfirmMessage(error?.message)) {
      clearFormError();
      return;
    }

    showFormError(error.message);
  }
});

return {
  openCreate,
  openEdit
};
}
