/*
  public/js/hub/index.js

  Starts the Hub page and wires all hub parts together.
*/

// --------------------------------------------------------------------------
// Shared values and helpers
// --------------------------------------------------------------------------
import {
  FEEDBACK_MODE_KEY,
  SELECTED_SPACE_KEY,
  SIDEBAR_STATE_KEY,
  TOAST_DURATION_KEY
} from "../shared/constants.js";

import { formatActionError, formatGlobalError } from "../shared/formatters.js";

import {
  clearAuthToken,
  getStoredValue,
  setStoredValue
} from "../shared/storage.js";

// --------------------------------------------------------------------------
// Hub core
// --------------------------------------------------------------------------
import { createHubApi } from "./core/api.js";
import { createHubController } from "./core/controller.js";
import { dom } from "./core/dom.js";
import { initializeHub } from "./core/init.js";
import { createHubLoaders } from "./core/loaders.js";
import { createHubState } from "./core/state.js";

// --------------------------------------------------------------------------
// Top-level hub UI
// --------------------------------------------------------------------------
import { createAuthController } from "./modules/shell/auth.js";
import { createFeedbackController } from "./modules/shell/feedback.js";
import { createMenuController } from "./modules/shell/menu.js";
import { applySidebarState, isMobileLayout, syncSidebarStateForViewport } from "./modules/shell/sidebar.js";

// --------------------------------------------------------------------------
// Device work
// --------------------------------------------------------------------------
import {
  handleDeviceAction,
  handleDeviceDelete,
  renderDevicesView,
  reorderDeviceView,
  sortVisibleDevicesView,
  updateRenderedDeviceStatusesView
} from "./modules/devices/index.js";

// --------------------------------------------------------------------------
// Space work
// --------------------------------------------------------------------------
import {
  getSpaceLabel as getSpaceLabelFromList,
  openAssignSpaceDialog as openAssignSpaceDialogView,
  openDeleteDialog as openDeleteDialogView,
  openSpaceDeleteDialog as openSpaceDeleteDialogView,
  openSpaceDialog as openSpaceDialogView,
  renderSpaces as renderSpacesView,
  updateSpaceSelectionState as updateSpaceSelectionStateView
} from "./modules/spaces/index.js";
import { getVisibleDevices, SPACE_ALL } from "./modules/spaces/base.js";

// --------------------------------------------------------------------------
// Page elements
// --------------------------------------------------------------------------
const {
  
  // Login.
  tokenForm,
  tokenInput,
  rememberDeviceInput,
  loginSubmitButton,
  setupSubmitButton,
  setupConfirmInput,
  toggleSetupConfirmButton,
  authScreen,
  authSubtitle,
  toggleTokenButton,
  authMessage,

  // Global messages.
  banner,
  liveRegion,
  toastStack,

  // Main layout.
  hub,
  hubLayout,
  sidebarScrim,

  // Spaces.
  sidebarToggle,
  closeSidebarButton,
  sectionSubtitle,
  spaceStatus,
  spaceList,

  // Devices.
  deviceSearchTrigger,
  deviceSearchDialog,
  deviceSearchInput,
  closeDeviceSearchButton,
  deviceSearchResults,
  deviceCountValue,
  deviceGrid,
  spaceTemplate,
  deviceTemplate,
  addDeviceButton,
  addSpaceButton,

  // Top menu.
  forgetButton,
  menu,
  menuTrigger,
  menuPanel,

  // Add device.
  deviceDialog,
  deviceForm,
  deviceDialogCopy,
  deviceDialogTitle,
  cancelDeviceFormButton,
  deviceSubmitButton,
  toggleDeviceTokenButton,
  unlockDeviceTokenWrap,
  unlockDeviceTokenButton,
  deviceFormMessage,
  deviceSecretDialog,
  deviceSecretForm,
  deviceSecretTitle,
  deviceSecretCopy,
  deviceSecretPasswordInput,
  toggleDeviceSecretPasswordButton,
  deviceSecretMessage,
  cancelDeviceSecretButton,

  // Delete device.
  deleteDialog,
  deleteForm,
  deleteTitle,
  deleteCopy,
  cancelDeleteButton,

  // Add or edit space.
  spaceDialog,
  spaceForm,
  spaceNameInput,
  spaceFormMessage,
  spaceDialogTitle,
  spaceDialogCopy,
  cancelSpaceButton,

  // Delete space.
  spaceDeleteDialog,
  spaceDeleteForm,
  spaceDeleteTitle,
  spaceDeleteCopy,
  cancelSpaceDeleteButton,

  // Move device to space.
  assignSpaceDialog,
  assignSpaceForm,
  assignSpaceTitle,
  assignSpaceCopy,
  assignSpaceOptions,
  assignSpaceMessage,
  cancelAssignSpaceButton
} = dom;

const MENU_ANIMATION_MS = 165;
const DEVICE_STATUS_POLL_MS = 5000;

// --------------------------------------------------------------------------
// Shell controllers
// --------------------------------------------------------------------------
const feedback = createFeedbackController({ banner, liveRegion, toastStack });
const auth = createAuthController({
  authFormContent: dom.authFormContent,
  authScreen,
  authSetupBlocked: dom.authSetupBlocked,
  authSubtitle,
  hub,
  authMessage,
  loginSubmitButton,
  rememberDeviceInput,
  setupConfirmInput,
  setupSubmitButton,
  setupConfirmWrap: dom.setupConfirmWrap,
  toggleSetupConfirmButton,
  tokenInput,
  submitButton: loginSubmitButton
});
const menuController = createMenuController({
  menu,
  menuTrigger,
  menuPanel,
  animationMs: MENU_ANIMATION_MS
});

auth.resetAuthMessage();

// --------------------------------------------------------------------------
// Saved state
// --------------------------------------------------------------------------
const state = createHubState({
  selectedSpace: getStoredValue(SELECTED_SPACE_KEY, SPACE_ALL) || SPACE_ALL,
  sidebarOpen: getStoredValue(SIDEBAR_STATE_KEY, "false") === "true"
});

// --------------------------------------------------------------------------
// API
// --------------------------------------------------------------------------
const api = createHubApi();

// These are set after the loader is created
let loadDevices;
let loadDeviceStatuses;
let openEditDevice = () => {};
let requestDevicePassword = () => Promise.reject(new Error("Password confirmation is unavailable."));

async function loadAppMeta() {
  try {
    const response = await fetch("/api/meta");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || `Request failed with ${response.status}`);
    }

    state.maxSpaces = Number(payload.maxSpaces) || 10;
    state.setupRequired = Boolean(payload.setupRequired);
    state.setupBlocked = Boolean(payload.setupBlocked);
  } catch {
    state.maxSpaces = 10;
    state.setupRequired = false;
    state.setupBlocked = false;
  }
}

async function loadInstanceSettings() {
  try {
    const payload = await api("/api/settings");
    applyInstanceSettings(payload.settings);
  } catch {
    applyInstanceSettings({
      feedbackDuration: 4000,
      feedbackMode: "inline"
    });
  }
}

function applyInstanceSettings(settings = {}) {
  document.documentElement.dataset.feedbackMode = settings.feedbackMode || getStoredValue(FEEDBACK_MODE_KEY, "inline") || "inline";
  document.documentElement.dataset.feedbackDuration = String(
    settings.feedbackDuration || Number(getStoredValue(TOAST_DURATION_KEY, "4000")) || 4000
  );
}

// --------------------------------------------------------------------------
// Main controller
// --------------------------------------------------------------------------
const controller = createHubController({
  core: {
    api,
    feedback,
    formatActionError,
    formatGlobalError,
    getLoadDevices: () => loadDevices,
    getSecretPassword: (options) => requestDevicePassword(options),
    getStoredValue,
    getVisibleDevices,
    getSpaceLabelFromList,
    isMobileLayout,
    selectedSpaceStorageKey: SELECTED_SPACE_KEY,
    setStoredValue,
    sidebarStateStorageKey: SIDEBAR_STATE_KEY,
    spaceAll: SPACE_ALL,
    state
  },
  sidebar: {
    applySidebarState,
    hubLayout,
    sidebarScrim,
    sidebarToggle
  },
  devices: {
    deleteCopy,
    deleteDialog,
    deleteTitle,
    deviceCountValue,
    deviceGrid,
    deviceTemplate,
    handleDeviceAction,
    handleDeviceDelete,
    openEditDevice: (device) => openEditDevice(device),
    reorderDeviceView,
    renderDevicesView,
    sortVisibleDevicesView,
    updateRenderedDeviceStatusesView
  },
  spaces: {
    assignSpaceCopy,
    assignSpaceDialog,
    assignSpaceMessage,
    assignSpaceOptions,
    assignSpaceTitle,
    openAssignSpaceDialogView,
    openDeleteDialogView,
    openSpaceDeleteDialogView,
    openSpaceDialogView,
    renderSpacesView,
    sectionSubtitle,
    spaceDeleteCopy,
    spaceDeleteDialog,
    spaceDeleteTitle,
    spaceDialog,
    spaceDialogCopy,
    spaceDialogTitle,
    spaceForm,
    spaceFormMessage,
    spaceList,
    spaceNameInput,
    spaceTemplate,
    updateSpaceSelectionStateView
  }
});

// --------------------------------------------------------------------------
// Loaders
// --------------------------------------------------------------------------
({ loadDevices, loadDeviceStatuses } = createHubLoaders({

  // Core.
  api,
  auth,
  clearAuthToken,
  feedback,
  formatGlobalError,
  setStoredValue,
  state,

  // Devices.
  deviceGrid,
  renderDevices: controller.renderDevices,
  updateRenderedDeviceStatuses: controller.updateRenderedDeviceStatuses,

  // Spaces.
  renderSpaces: controller.renderSpaces,
  selectedSpaceStorageKey: SELECTED_SPACE_KEY,
  setSelectedSpace: (value) => {
    state.selectedSpace = value;
  },
  spaceList,
  spaceAll: SPACE_ALL
}));

// --------------------------------------------------------------------------
// Start the page
// --------------------------------------------------------------------------
state.sidebarOpen = syncSidebarStateForViewport({
  getStoredValue,
  storageKey: SIDEBAR_STATE_KEY
});
controller.applyCurrentSidebarState();

await loadAppMeta();
const {
  deviceFormController,
  requestDevicePassword: requestDevicePasswordHandler,
  initialLoadPromise
} = await initializeHub({

  // Top bar and shell.
  addDeviceButton,
  addSpaceButton,
  applyCurrentSidebarState: controller.applyCurrentSidebarState,
  closeSidebarButton,
  menuController,
  menuTrigger,
  sidebarScrim,
  sidebarToggle,
  spaceStatus,
  toggleTokenButton,

  // Login.
  auth,
  forgetButton,
  tokenForm,
  tokenInput,
  toggleSetupConfirmButton,

  // Shared page state and helpers.
  api,
  appState: state,
  feedback,
  isMobileLayout,
  loadDevices,
  maxSpaces: state.maxSpaces,
  clearAuthToken,
  deviceSearchDialog,
  deviceSearchResults,
  deviceSearchTrigger,
  deviceSearchInput,
  closeDeviceSearchButton,
  rememberDeviceInput,
  setupConfirmInput,
  selectSpaceStorageKey: SELECTED_SPACE_KEY,
  setStoredValue,
  sidebarStateStorageKey: SIDEBAR_STATE_KEY,
  spaceAll: SPACE_ALL,
  syncCurrentSidebarStateForViewport: controller.syncCurrentSidebarStateForViewport,
  jumpToDevice: controller.jumpToDevice,
  renderDevices: controller.renderDevices,

  // Device delete flow.
  deleteDialog,
  deleteForm,
  deleteTitle,
  handleDelete: controller.handleDelete,
  cancelDeleteButton,

  // Add device.
  deviceDialog,
  deviceForm,
  deviceDialogCopy,
  deviceDialogTitle,
  deviceFormMessage,
  deviceSecretDialog,
  deviceSecretForm,
  deviceSecretTitle,
  deviceSecretCopy,
  deviceSecretPasswordInput,
  toggleDeviceSecretPasswordButton,
  deviceSecretMessage,
  cancelDeviceSecretButton,
  deviceSubmitButton,
  toggleDeviceTokenButton,
  unlockDeviceTokenWrap,
  unlockDeviceTokenButton,
  deviceGrid,
  cancelDeviceFormButton,

  // Spaces.
  openSpaceDialog: controller.openSpaceDialog,
  spaceDialog,
  spaceForm,
  spaceFormMessage,
  spaceNameInput,
  cancelSpaceButton,

  // Delete space.
  cancelSpaceDeleteButton,
  spaceDeleteDialog,
  spaceDeleteTitle,
  spaceDeleteForm,

  // Move device to space.
  assignSpaceDialog,
  assignSpaceForm,
  assignSpaceTitle,
  assignSpaceMessage,
  cancelAssignSpaceButton
});

requestDevicePassword = requestDevicePasswordHandler;

openEditDevice = async (device) => {
  try {
    const payload = await api(`/api/devices/${device.id}`);
    deviceFormController.openEdit(payload.device || device);
  } catch (error) {
    feedback.showBanner(formatGlobalError(error));
  }
};

await initialLoadPromise;

setInterval(() => {
  if (document.documentElement.dataset.session !== "unlocked") {
    return;
  }

  void loadDeviceStatuses();
}, DEVICE_STATUS_POLL_MS);

await loadInstanceSettings();
document.querySelector(".app-shell")?.removeAttribute("hidden");
document.documentElement.dataset.hubReady = "true";
