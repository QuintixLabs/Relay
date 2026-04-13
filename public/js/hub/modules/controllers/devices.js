/*
  public/js/hub/modules/controllers/devices.js

  Handles Hub device rendering, row actions, jumping, and reordering.
*/

export function createDevicesController({
  api,
  deviceCountValue,
  deviceGrid,
  deviceTemplate,
  feedback,
  formatActionError,
  formatGlobalError,
  getLoadDevices,
  getSecretPassword,
  getSpaceLabel,
  getVisibleDevices,
  handleDeviceAction,
  handleDeviceDelete,
  openAssignSpaceDialog,
  openDeleteDialog,
  openEditDevice,
  renderDevicesView,
  reorderDeviceView,
  sortVisibleDevicesView,
  spaceAll,
  state,
  updateRenderedDeviceStatusesView
}) {
  function renderDevices() {
    const visibleDevices = getVisibleDevices(state.currentDevices, state.selectedSpace);
    const devices = sortVisibleDevicesView({
      currentOrders: state.currentOrders,
      devices: visibleDevices,
      selectedSpace: state.selectedSpace,
      spaceAll
    });
    const renderedView = renderDevicesView({
      fetchDeviceForConfig: async (device) => {
        try {
          return await getSecretPassword({
            title: "Download device config",
            message: "Enter your current Hub password to download this device config.",
            confirmAction: async (password) => {
              const response = await api(`/api/devices/${device.id}/config`, {
                method: "POST",
                body: JSON.stringify({ password })
              });
              return response?.config || device;
            }
          });
        } catch (error) {
          if (error?.message === "Password confirmation was cancelled.") {
            return null;
          }

          throw error;
        }
      },
      currentDeviceStatuses: state.currentDeviceStatuses,
      deviceRowCache: state.deviceRowCache,
      deviceCountValue,
      deviceGrid,
      deviceTemplate,
      devices,
      emptyMessage: "No devices found.",
      feedback,
      getDragState: () => ({
        draggingDeviceId: state.draggingDeviceId,
        draggedRowElement: state.draggedRowElement,
        dragMoved: state.dragMoved
      }),
      getSpaceLabel,
      onAction: handleAction,
      onDelete: openDeleteDialog,
      onEdit: openEditDevice,
      onOpenAssignSpace: openAssignSpaceDialog,
      onReorderDevice: reorderDevice,
      setDragState: (nextState) => {
        if ("draggingDeviceId" in nextState) state.draggingDeviceId = nextState.draggingDeviceId;
        if ("draggedRowElement" in nextState) state.draggedRowElement = nextState.draggedRowElement;
        if ("dragMoved" in nextState) state.dragMoved = nextState.dragMoved;
      }
    });

    state.renderedDeviceRows = renderedView.rows;
    state.renderedDeviceOrder = renderedView.order;
    flushPendingDeviceFeedback();
    flushPendingDeviceJump();
  }

  function flushPendingDeviceFeedback() {
    const pendingFeedback = state.pendingDeviceFeedback;
    if (!pendingFeedback) {
      return;
    }

    const row = state.renderedDeviceRows?.get(String(pendingFeedback.deviceId));
    const status = row?.querySelector(".device-status");

    if (status) {
      feedback.reportFeedback(status, pendingFeedback.message, pendingFeedback.tone);
      state.pendingDeviceFeedback = null;
      return;
    }

    if ((document.documentElement.dataset.feedbackMode || "inline") === "toast") {
      const fallbackStatus = document.createElement("div");
      feedback.reportFeedback(fallbackStatus, pendingFeedback.message, pendingFeedback.tone);
      state.pendingDeviceFeedback = null;
    }
  }

  function flushPendingDeviceJump() {
    if (!state.pendingJumpDeviceId && !state.pendingJumpDeviceKey) {
      return;
    }

    const targetDeviceId = state.pendingJumpDeviceId;
    const targetDeviceKey = state.pendingJumpDeviceKey;
    state.pendingJumpDeviceId = null;
    state.pendingJumpDeviceKey = null;

    requestAnimationFrame(() => {
      let row = state.renderedDeviceRows?.get(targetDeviceId);

      if (!row && targetDeviceKey) {
        row = state.renderedDeviceOrder.find((entry) => {
          return `${entry.name}::${entry.host}::${entry.port}` === targetDeviceKey;
        })?.row;
      }

      if (!row) {
        return;
      }

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      row.dataset.searchHighlight = "true";
      row.tabIndex = -1;
      forceScrollToRow(row);
      row.focus({ preventScroll: true });

      for (const delay of [0, 80, 180, 320, 520]) {
        window.setTimeout(() => {
          if (row.isConnected) {
            forceScrollToRow(row);
          }
        }, delay);
      }

      window.setTimeout(() => {
        if (row.isConnected) {
          delete row.dataset.searchHighlight;
          row.removeAttribute("tabindex");
        }
      }, 1800);
    });
  }

  function forceScrollToRow(row) {
    const scrollingElement = document.scrollingElement || document.documentElement;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const rect = row.getBoundingClientRect();
    const currentTop = scrollingElement.scrollTop;
    const targetTop = Math.max(0, currentTop + rect.top - Math.max(24, (viewportHeight - rect.height) / 2));

    scrollingElement.scrollTop = targetTop;
    document.documentElement.scrollTop = targetTop;
    document.body.scrollTop = targetTop;
    window.scrollTo(0, targetTop);
  }

  function updateRenderedDeviceStatuses() {
    updateRenderedDeviceStatusesView({
      currentDeviceStatuses: state.currentDeviceStatuses,
      deviceGrid
    });
  }

  async function handleAction(device, action, button) {
    await handleDeviceAction({ action, api, button, device, feedback, formatActionError });
  }

  async function handleDelete(device) {
    await handleDeviceDelete({
      api,
      device,
      deviceGrid,
      feedback,
      formatGlobalError,
      onLoadDevices: getLoadDevices()
    });
  }

  async function reorderDevice(sourceId, targetId, placement) {
    const orderList =
      state.selectedSpace === spaceAll
        ? (state.currentOrders.all ??= state.currentDevices.map((device) => device.id))
        : (state.currentOrders.spaces[state.selectedSpace] ??= getVisibleDevices(state.currentDevices, state.selectedSpace).map(
            (device) => device.id
          ));
    const sourceIndex = orderList.indexOf(sourceId);
    const targetIndex = orderList.indexOf(targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }

    orderList.splice(sourceIndex, 1);
    const nextTargetIndex = orderList.indexOf(targetId);
    const insertIndex = placement === "after" ? nextTargetIndex + 1 : nextTargetIndex;
    orderList.splice(insertIndex, 0, sourceId);

    await reorderDeviceView({
      api,
      placement,
      scopeSpaceId: state.selectedSpace === spaceAll ? null : state.selectedSpace,
      sourceId,
      targetId
    });
  }

  function jumpToDevice(device, { applyCurrentSidebarState, isMobileLayout, selectedSpaceStorageKey, setStoredValue, updateSpaceSelectionState }) {
    if (!device) {
      return;
    }

    state.selectedSpace = device.spaceId || spaceAll;
    state.pendingJumpDeviceId = String(device.id);
    state.pendingJumpDeviceKey = `${device.name}::${device.host}::${device.port}`;
    setStoredValue(selectedSpaceStorageKey, state.selectedSpace);

    if (isMobileLayout()) {
      state.sidebarOpen = false;
    }

    applyCurrentSidebarState();
    updateSpaceSelectionState();
    renderDevices();
  }

  return {
    handleAction,
    handleDelete,
    jumpToDevice,
    renderDevices,
    reorderDevice,
    updateRenderedDeviceStatuses
  };
}
