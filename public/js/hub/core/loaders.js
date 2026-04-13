/*
  public/js/hub/core/loaders.js

  Loads Hub data from the server and updates the page.
*/

import { SESSION_EXPIRED_MESSAGE, WRONG_PASSWORD_MESSAGE } from "../../shared/formatters.js";

export function createHubLoaders({
  // Core services.
  api,
  feedback,
  formatGlobalError,

  // Auth and state.
  auth,
  state,
  clearAuthToken,
  setSelectedSpace,
  setStoredValue,

  // Layout and rendering.
  deviceGrid,
  spaceList,
  renderDevices,
  renderSpaces,
  updateRenderedDeviceStatuses,

  // Shared values.
  spaceAll,
  selectedSpaceStorageKey
}) {
  // --------------------------------------------------------------------------
  // Auth helpers
  // --------------------------------------------------------------------------
  function isSessionExpiredError(error) {
    return String(error?.message || "").toLowerCase().includes("session expired");
  }

  function isAuthFailure(error) {
    const lower = String(error?.message || "").toLowerCase();

    return (
      lower.includes("session expired") ||
      lower.includes("unauthorized") ||
      lower.includes("too many wrong password attempts")
    );
  }

  function clearPersistedAuth() {
    clearAuthToken();
  }

  function resetLockedHub() {
    deviceGrid.innerHTML = "";
    spaceList.innerHTML = "";
    auth.setUnlocked(false);
  }

  function showAuthFailure(error, { fromStoredToken }) {
    const sessionExpired = isSessionExpiredError(error);
    const loginAttempt = state.authPending && !fromStoredToken;

    if (fromStoredToken) {
      auth.clearAuthMessage();
      feedback.hideBanner();
      return;
    }

    if (sessionExpired) {
      auth.setAuthMessage(
        loginAttempt ? WRONG_PASSWORD_MESSAGE : SESSION_EXPIRED_MESSAGE
      );
      feedback.hideBanner();
      return;
    }

    const message = formatGlobalError(error);
    auth.setAuthMessage(message);
    feedback.showBanner(message);
  }

  // --------------------------------------------------------------------------
  // State helpers
  // --------------------------------------------------------------------------
  function applyLoadedDevices(payload) {
    state.currentDevices = payload.devices || [];
    state.currentSpaces = payload.spaces || [];
    state.currentOrders = payload.orders || {
      all: state.currentDevices.map((device) => device.id),
      spaces: {}
    };
    state.currentDeviceStatuses = Object.fromEntries(
      state.currentDevices.map((device) => [
        device.id,
        state.currentDeviceStatuses[device.id] || { state: "offline" }
      ])
    );
  }

  function syncSelectedSpace() {
    if (
      state.selectedSpace !== spaceAll &&
      !state.currentSpaces.some((space) => space.id === state.selectedSpace)
    ) {
      state.selectedSpace = spaceAll;
      setSelectedSpace(spaceAll);
      setStoredValue(selectedSpaceStorageKey, state.selectedSpace);
    }
  }

  // --------------------------------------------------------------------------
  // Loaders
  // --------------------------------------------------------------------------
  async function loadDeviceStatuses() {
    try {
      const payload = await api("/api/device-statuses");
      state.currentDeviceStatuses = payload.statuses || {};
    } catch {
      // Keep the last known statuses if a single poll fails.
      // A brief fetch hiccup should not make every device flap offline in the UI.
      state.currentDeviceStatuses ||= Object.fromEntries(
        state.currentDevices.map((device) => [device.id, { state: "offline" }])
      );
    }

    updateRenderedDeviceStatuses();
  }

  async function loadDevices({ fromStoredToken = false } = {}) {
    if (state.setupRequired) {
      auth.setAuthMessage("Create a password to finish setup.");
      auth.setUnlocked(false);
      return false;
    }

    try {
      const payload = await api("/api/devices");

      applyLoadedDevices(payload);
      syncSelectedSpace();

      renderSpaces();
      renderDevices();
      void loadDeviceStatuses();
      auth.clearAuthMessage();
      feedback.hideBanner();
      auth.setUnlocked(true);
      return true;
    } catch (error) {
      if (isAuthFailure(error)) {
        clearPersistedAuth();
      }

      resetLockedHub();
      showAuthFailure(error, { fromStoredToken });
      return false;
    }
  }

  return {
    loadDevices,
    loadDeviceStatuses
  };
}
