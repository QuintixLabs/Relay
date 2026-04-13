/*
  public/js/hub/core/controller.js

  Connects Hub state, page elements, and feature controllers.
*/

import { createDevicesController } from "../modules/controllers/devices.js";
import { createSidebarController } from "../modules/controllers/sidebar.js";
import { createSpacesController } from "../modules/controllers/spaces.js";

export function createHubController({
  core,
  sidebar: sidebarDependencies,
  devices: deviceDependencies,
  spaces: spaceDependencies
}) {
  const {
    api,
    feedback,
    formatActionError,
    formatGlobalError,
    getLoadDevices,
    getSecretPassword,
    getStoredValue,
    getVisibleDevices,
    getSpaceLabelFromList,
    isMobileLayout,
    selectedSpaceStorageKey,
    setStoredValue,
    sidebarStateStorageKey,
    spaceAll,
    state
  } = core;

  const {
    applySidebarState,
    hubLayout,
    sidebarScrim,
    sidebarToggle
  } = sidebarDependencies;

  const {
    deleteCopy,
    deleteDialog,
    deleteTitle,
    deviceCountValue,
    deviceGrid,
    deviceTemplate,
    handleDeviceAction,
    handleDeviceDelete,
    openEditDevice,
    reorderDeviceView,
    renderDevicesView,
    sortVisibleDevicesView,
    updateRenderedDeviceStatusesView
  } = deviceDependencies;

  const {
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
  } = spaceDependencies;

  const sidebar = createSidebarController({
    applySidebarState,
    getStoredValue,
    hubLayout,
    isMobileLayout,
    sidebarScrim,
    sidebarStateStorageKey,
    sidebarToggle,
    state
  });

  let devices = null;

  const spaces = createSpacesController({
    applyCurrentSidebarState: sidebar.applyCurrentSidebarState,
    assignSpaceCopy,
    assignSpaceDialog,
    assignSpaceMessage,
    assignSpaceOptions,
    assignSpaceTitle,
    deleteCopy,
    deleteDialog,
    deleteTitle,
    getSpaceLabelFromList,
    isMobileLayout,
    openAssignSpaceDialogView,
    openDeleteDialogView,
    openSpaceDeleteDialogView,
    openSpaceDialogView,
    renderDevices: () => devices.renderDevices(),
    renderSpacesView,
    sectionSubtitle,
    selectedSpaceStorageKey,
    setStoredValue,
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
    state,
    updateSpaceSelectionStateView
  });

  devices = createDevicesController({
    api,
    deviceCountValue,
    deviceGrid,
    deviceTemplate,
    feedback,
    formatActionError,
    formatGlobalError,
    getLoadDevices,
    getSecretPassword,
    getSpaceLabel: spaces.getSpaceLabel,
    getVisibleDevices,
    handleDeviceAction,
    handleDeviceDelete,
    openAssignSpaceDialog: spaces.openAssignSpaceDialog,
    openDeleteDialog: spaces.openDeleteDialog,
    openEditDevice,
    renderDevicesView,
    reorderDeviceView,
    sortVisibleDevicesView,
    spaceAll,
    state,
    updateRenderedDeviceStatusesView
  });

  return {
    applyCurrentSidebarState: sidebar.applyCurrentSidebarState,
    getSpaceLabel: spaces.getSpaceLabel,
    handleAction: devices.handleAction,
    handleDelete: devices.handleDelete,
    jumpToDevice: (device) =>
      devices.jumpToDevice(device, {
        applyCurrentSidebarState: sidebar.applyCurrentSidebarState,
        isMobileLayout,
        selectedSpaceStorageKey,
        setStoredValue,
        updateSpaceSelectionState: spaces.updateSpaceSelectionState
      }),
    openAssignSpaceDialog: spaces.openAssignSpaceDialog,
    openDeleteDialog: spaces.openDeleteDialog,
    openSpaceDeleteDialog: spaces.openSpaceDeleteDialog,
    openSpaceDialog: spaces.openSpaceDialog,
    renderDevices: devices.renderDevices,
    renderSpaces: spaces.renderSpaces,
    reorderDevice: devices.reorderDevice,
    syncCurrentSidebarStateForViewport: sidebar.syncCurrentSidebarStateForViewport,
    updateRenderedDeviceStatuses: devices.updateRenderedDeviceStatuses,
    updateSpaceSelectionState: spaces.updateSpaceSelectionState
  };
}
