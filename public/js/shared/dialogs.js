/*
  public/js/shared/dialogs.js

  Handles shared dialog opening, closing, and scroll locking.
*/

const DIALOG_CLOSE_MS = 220;

let scrollLockCount = 0;
let lockedScrollY = 0;
let pinnedSidebar = null;
let sidebarPlaceholder = null;

function isMobileLayout() {
  return window.matchMedia("(max-width: 720px)").matches;
}

function pinDesktopSidebar() {
  if (isMobileLayout()) {
    return;
  }

  const sidebar = document.querySelector(".spaces-sidebar");
  if (!sidebar) {
    return;
  }

  const rect = sidebar.getBoundingClientRect();
  sidebarPlaceholder = document.createElement("div");
  sidebarPlaceholder.className = "spaces-sidebar-placeholder";
  sidebarPlaceholder.style.width = `${rect.width}px`;
  sidebarPlaceholder.style.minWidth = `${rect.width}px`;
  sidebarPlaceholder.style.height = `${rect.height}px`;
  sidebarPlaceholder.style.flex = `0 0 ${rect.width}px`;
  sidebar.before(sidebarPlaceholder);

  pinnedSidebar = {
    element: sidebar,
    style: {
      flex: sidebar.style.flex,
      position: sidebar.style.position,
      top: sidebar.style.top,
      left: sidebar.style.left,
      width: sidebar.style.width,
      minWidth: sidebar.style.minWidth,
      zIndex: sidebar.style.zIndex
    }
  };

  sidebar.style.position = "fixed";
  sidebar.style.top = `${rect.top}px`;
  sidebar.style.left = `${rect.left}px`;
  sidebar.style.width = `${rect.width}px`;
  sidebar.style.minWidth = `${rect.width}px`;
  sidebar.style.flex = `0 0 ${rect.width}px`;
  sidebar.style.zIndex = "16";
}

function unpinDesktopSidebar() {
  if (!pinnedSidebar) {
    return;
  }

  const { element, style } = pinnedSidebar;
  if (sidebarPlaceholder) {
    sidebarPlaceholder.remove();
    sidebarPlaceholder = null;
  }
  element.style.flex = style.flex;
  element.style.position = style.position;
  element.style.top = style.top;
  element.style.left = style.left;
  element.style.width = style.width;
  element.style.minWidth = style.minWidth;
  element.style.zIndex = style.zIndex;
  pinnedSidebar = null;
}

function lockPageScroll() {
  scrollLockCount += 1;
  if (scrollLockCount > 1) {
    return;
  }

  lockedScrollY = window.scrollY;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  pinDesktopSidebar();

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function unlockPageScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount > 0) {
    return;
  }

  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  document.body.style.paddingRight = "";
  unpinDesktopSidebar();
  window.scrollTo(0, lockedScrollY);
}

export function enhanceDialog(dialog, { shouldLockScroll }) {
  const originalShowModal = dialog.showModal.bind(dialog);

  dialog.showModal = () => {
    if (shouldLockScroll()) {
      lockPageScroll();
    }

    dialog.dataset.closing = "false";
    dialog.dataset.visible = "false";
    originalShowModal();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dialog.dataset.visible = "true";
      });
    });
  };

  function closeWithAnimation() {
    if (!dialog.open || dialog.dataset.closing === "true") {
      return;
    }

    dialog.dataset.closing = "true";
    dialog.dataset.visible = "false";

    window.setTimeout(() => {
      if (dialog.open) {
        dialog.close();
      }
    }, DIALOG_CLOSE_MS);
  }

  dialog.addEventListener("close", () => {
    if (shouldLockScroll()) {
      unlockPageScroll();
    }
    delete dialog.dataset.closing;
    delete dialog.dataset.visible;
  });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeWithAnimation();
  });

  return {
    close: closeWithAnimation
  };
}
