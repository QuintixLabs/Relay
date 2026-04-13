/*
  public/js/hub/modules/controllers/sidebar.js

  Handles Hub sidebar state and viewport sync.
*/

export function createSidebarController({
  applySidebarState,
  getStoredValue,
  hubLayout,
  isMobileLayout,
  sidebarScrim,
  sidebarStateStorageKey,
  sidebarToggle,
  state
}) {
  function applyCurrentSidebarState() {
    applySidebarState({
      hubLayout,
      sidebarOpen: state.sidebarOpen,
      sidebarScrim,
      sidebarToggle
    });
  }

  function syncCurrentSidebarStateForViewport() {
    state.sidebarOpen = getStoredValue(sidebarStateStorageKey, "false") === "true";
    if (isMobileLayout()) {
      state.sidebarOpen = false;
    }
    applyCurrentSidebarState();
  }

  return {
    applyCurrentSidebarState,
    syncCurrentSidebarStateForViewport
  };
}
