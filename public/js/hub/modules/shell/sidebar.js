/*
  public/js/hub/modules/shell/sidebar.js

  Handles the Hub sidebar open and close state.
*/

let mobileSidebarLocked = false;
let mobileSidebarScrollY = 0;

export function isMobileLayout() {
  return window.matchMedia("(max-width: 720px)").matches;
}

function lockMobilePageScroll() {
  if (mobileSidebarLocked) {
    return;
  }

  mobileSidebarLocked = true;
  mobileSidebarScrollY = window.scrollY;

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.top = `-${mobileSidebarScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockMobilePageScroll() {
  if (!mobileSidebarLocked) {
    return;
  }

  mobileSidebarLocked = false;

  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";

  window.scrollTo(0, mobileSidebarScrollY);
}

export function applySidebarState({ hubLayout, sidebarOpen, sidebarScrim, sidebarToggle }) {
  const open = sidebarOpen;
  const mobileOpen = isMobileLayout() && open;

  if (mobileOpen) {
    lockMobilePageScroll();
  } else {
    unlockMobilePageScroll();
  }

  document.documentElement.dataset.sidebarOpen = String(open);
  hubLayout.dataset.sidebarOpen = String(open);
  sidebarToggle.setAttribute("aria-expanded", String(open));
  sidebarScrim.dataset.visible = String(mobileOpen);
}

export function syncSidebarStateForViewport({ getStoredValue, storageKey }) {
  if (isMobileLayout()) {
    unlockMobilePageScroll();
    return false;
  }

  unlockMobilePageScroll();
  return getStoredValue(storageKey, "false") === "true";
}

export function bindSidebarShell({
  appState,
  applyCurrentSidebarState,
  closeSidebarButton,
  isMobileLayout,
  setStoredValue,
  sidebarScrim,
  sidebarStateStorageKey,
  sidebarToggle,
  syncCurrentSidebarStateForViewport
}) {
  sidebarToggle.addEventListener("click", () => {
    appState.sidebarOpen = !appState.sidebarOpen;
    if (!isMobileLayout()) {
      setStoredValue(sidebarStateStorageKey, String(appState.sidebarOpen));
    }
    applyCurrentSidebarState();
  });

  closeSidebarButton.addEventListener("click", () => {
    appState.sidebarOpen = false;
    applyCurrentSidebarState();
  });

  sidebarScrim.addEventListener("click", () => {
    appState.sidebarOpen = false;
    if (!isMobileLayout()) {
      setStoredValue(sidebarStateStorageKey, "false");
    }
    applyCurrentSidebarState();
  });

  window.addEventListener("resize", syncCurrentSidebarStateForViewport);
}
