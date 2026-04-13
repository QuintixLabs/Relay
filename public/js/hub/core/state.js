/*
  public/js/hub/core/state.js

  Stores the live Hub state used across the page.
*/

export function createHubState(initialState = {}) {
  return {
    authPending: false,
    currentDevices: [],
    currentSpaces: [],
    currentOrders: { all: [], spaces: {} },
    currentDeviceStatuses: {},
    maxSpaces: null,
    setupRequired: false,
    setupBlocked: false,
    selectedSpace: "all",
    commandSearchQuery: "",
    pendingJumpDeviceId: null,
    pendingJumpDeviceKey: null,
    pendingDeviceFeedback: null,
    deviceRowCache: new Map(),
    renderedDeviceRows: new Map(),
    renderedDeviceOrder: [],
    deleteTarget: null,
    deleteSpaceTarget: null,
    assignSpaceTarget: null,
    editingSpaceTarget: null,
    sidebarOpen: true,
    draggingDeviceId: null,
    draggedRowElement: null,
    dragMoved: false,
    ...initialState
  };
}
