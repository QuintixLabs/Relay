/*
  public/js/shared/modal.js

  Holds small helpers for modal text and modal form errors.
*/

import { enhanceDialog } from "./dialogs.js";

let sharedNoticeDialog = null;

export function clearModalFormError(form, message) {
  form.dataset.hasError = "false";
  message.textContent = "";
  message.dataset.visible = "false";
}

export function showModalFormError(form, message, text) {
  form.dataset.hasError = "true";
  message.textContent = text;
  message.dataset.visible = "false";
  message.getBoundingClientRect();
  requestAnimationFrame(() => {
    message.dataset.visible = "true";
  });
}

export function bindDialog(dialog, closeButton, cancelButton) {
  function shouldLockScroll() {
    return true;
  }

  const dialogController = enhanceDialog(dialog, { shouldLockScroll });

  closeButton?.addEventListener("click", () => dialogController.close());
  cancelButton.addEventListener("click", () => dialogController.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialogController.close();
    }
  });
  return dialogController;
}

function createNode(tag, { className = "", text = "", attrs = {} } = {}) {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (text) {
    node.textContent = text;
  }

  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) {
      continue;
    }

    if (value === true) {
      node.setAttribute(key, "");
      continue;
    }

    node.setAttribute(key, String(value));
  }

  return node;
}

function getSharedNoticeDialog() {
  if (sharedNoticeDialog) {
    return sharedNoticeDialog;
  }

  const dialog = createNode("dialog", {
    className: "device-dialog confirm-dialog"
  });
  const form = createNode("form", {
    className: "device-form",
    attrs: { method: "dialog" }
  });
  const header = createNode("header", { className: "device-form-header" });
  const headerCopy = createNode("div");
  const title = createNode("p", {
    className: "app-title",
    text: "Something went wrong"
  });
  const copy = createNode("p", {
    className: "app-state",
    text: "Try again."
  });
  const footer = createNode("footer", {
    className: "device-form-actions"
  });
  const closeButton = createNode("button", {
    className: "primary-button",
    text: "OK",
    attrs: { type: "button" }
  });

  headerCopy.append(title, copy);
  header.append(headerCopy);
  footer.append(closeButton);
  form.append(header, footer);
  dialog.append(form);
  document.body.append(dialog);

  const controller = bindDialog(dialog, null, closeButton);

  sharedNoticeDialog = {
    dialog,
    title,
    copy,
    controller
  };

  return sharedNoticeDialog;
}

export function showNoticeDialog({ title = "Something went wrong", message = "Try again." } = {}) {
  const notice = getSharedNoticeDialog();
  notice.title.textContent = title;
  notice.copy.textContent = message;
  notice.dialog.showModal();
}
