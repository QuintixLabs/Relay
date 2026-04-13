/*
  public/js/hub/modules/devices/drag.js

  Handles device row drag, touch reorder, and drag auto-scroll.
*/

import {
  animateDeviceGridReflow,
  captureDeviceRowRects
} from "./presence.js";

const DRAG_SCROLL_EDGE_PX = 72;
const DRAG_SCROLL_STEP_PX = 18;
let dragScrollDirection = 0;
let dragScrollFrameId = 0;

function setGlobalDragState(active) {
  document.documentElement.dataset.deviceDragActive = active ? "true" : "false";
}

// --------------------------------------------------------------------------
// Ordered rows
// --------------------------------------------------------------------------
export function getOrderedVisibleRows(deviceGrid) {
  return Array.from(deviceGrid.querySelectorAll(".device-row"))
    .filter((row) => !row.hidden)
    .sort((left, right) => Number(left.style.order || 0) - Number(right.style.order || 0));
}

export function moveDraggedRow(deviceGrid, draggedRowElement, targetRow, placement) {
  const orderedRows = getOrderedVisibleRows(deviceGrid);
  const draggedIndex = orderedRows.indexOf(draggedRowElement);
  const targetIndex = orderedRows.indexOf(targetRow);

  if (draggedIndex === -1 || targetIndex === -1) {
    return false;
  }

  const nextRows = [...orderedRows];
  nextRows.splice(draggedIndex, 1);
  const insertTargetIndex = nextRows.indexOf(targetRow);
  const insertIndex = placement === "after" ? insertTargetIndex + 1 : insertTargetIndex;

  if (orderedRows[Math.min(insertIndex, orderedRows.length - 1)] === draggedRowElement) {
    return false;
  }

  nextRows.splice(insertIndex, 0, draggedRowElement);
  nextRows.forEach((row, index) => {
    row.style.order = String(index);
  });

  return true;
}

async function persistDraggedRowOrder({
  deviceGrid,
  draggedRowElement,
  draggingDeviceId,
  onReorderDevice
}) {
  if (!draggingDeviceId || !draggedRowElement) {
    return;
  }

  const visibleRows = getOrderedVisibleRows(deviceGrid);
  const draggedIndex = visibleRows.indexOf(draggedRowElement);

  if (draggedIndex > 0) {
    const previousRow = visibleRows[draggedIndex - 1];
    await onReorderDevice(draggingDeviceId, previousRow.dataset.deviceId, "after");
    return;
  }

  if (draggedIndex !== -1 && draggedIndex < visibleRows.length - 1) {
    const nextRow = visibleRows[draggedIndex + 1];
    await onReorderDevice(draggingDeviceId, nextRow.dataset.deviceId, "before");
  }
}

// --------------------------------------------------------------------------
// Drag auto-scroll
// --------------------------------------------------------------------------
function stopDragAutoScroll() {
  dragScrollDirection = 0;

  if (!dragScrollFrameId) {
    return;
  }

  cancelAnimationFrame(dragScrollFrameId);
  dragScrollFrameId = 0;
}

function runDragAutoScroll() {
  if (!dragScrollDirection) {
    dragScrollFrameId = 0;
    return;
  }

  window.scrollBy(0, dragScrollDirection * DRAG_SCROLL_STEP_PX);
  dragScrollFrameId = requestAnimationFrame(runDragAutoScroll);
}

function updateDragAutoScroll(clientY) {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  let nextDirection = 0;

  if (clientY <= DRAG_SCROLL_EDGE_PX) {
    nextDirection = -1;
  } else if (clientY >= viewportHeight - DRAG_SCROLL_EDGE_PX) {
    nextDirection = 1;
  }

  if (nextDirection === dragScrollDirection) {
    return;
  }

  dragScrollDirection = nextDirection;

  if (!dragScrollDirection) {
    stopDragAutoScroll();
    return;
  }

  if (!dragScrollFrameId) {
    dragScrollFrameId = requestAnimationFrame(runDragAutoScroll);
  }
}

// --------------------------------------------------------------------------
// Touch drag
// --------------------------------------------------------------------------
function bindTouchRowDrag({
  device,
  deviceGrid,
  getDragState,
  onReorderDevice,
  row,
  rowDragHandle,
  setDragState
}) {
  rowDragHandle.onpointerdown = (event) => {
    if (event.pointerType === "mouse") {
      return;
    }

    event.preventDefault();
    rowDragHandle.setPointerCapture?.(event.pointerId);
    setGlobalDragState(true);

    setDragState({
      draggingDeviceId: device.id,
      draggedRowElement: row,
      dragMoved: false
    });
    row.dataset.dragging = "true";

    const pointerId = event.pointerId;

    const clearTouchDrag = () => {
      stopDragAutoScroll();
      setGlobalDragState(false);
      setDragState({
        draggingDeviceId: null,
        draggedRowElement: null,
        dragMoved: false
      });
      delete row.dataset.dragging;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };

    const handlePointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return;
      }

      const { draggedRowElement, draggingDeviceId } = getDragState();
      if (!draggingDeviceId || !draggedRowElement) {
        return;
      }

      updateDragAutoScroll(moveEvent.clientY);

      const targetRow = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest(".device-row");
      if (!targetRow || targetRow === draggedRowElement) {
        return;
      }

      const beforeRects = captureDeviceRowRects(deviceGrid);
      const rect = targetRow.getBoundingClientRect();
      const placement = moveEvent.clientY > rect.top + rect.height / 2 ? "after" : "before";

      if (moveDraggedRow(deviceGrid, draggedRowElement, targetRow, placement)) {
        setDragState({ dragMoved: true });
        animateDeviceGridReflow(deviceGrid, beforeRects);
      }
    };

    const handlePointerEnd = async (endEvent) => {
      if (endEvent.pointerId !== pointerId) {
        return;
      }

      const { dragMoved, draggedRowElement, draggingDeviceId } = getDragState();
      rowDragHandle.releasePointerCapture?.(pointerId);
      clearTouchDrag();

      if (!dragMoved || !draggingDeviceId || !draggedRowElement) {
        return;
      }

      await persistDraggedRowOrder({
        deviceGrid,
        draggedRowElement,
        draggingDeviceId,
        onReorderDevice
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
  };
}

// --------------------------------------------------------------------------
// Shared row binding
// --------------------------------------------------------------------------
export function bindRowDragInteractions({
  device,
  deviceGrid,
  getDragState,
  onReorderDevice,
  row,
  rowDragHandle,
  setDragState
}) {
  rowDragHandle.onmousedown = () => {
    row.draggable = true;
  };

  rowDragHandle.onmouseup = () => {
    row.draggable = false;
  };

  bindTouchRowDrag({
    device,
    deviceGrid,
    getDragState,
    onReorderDevice,
    row,
    rowDragHandle,
    setDragState
  });

  row.ondragstart = (event) => {
    stopDragAutoScroll();
    setGlobalDragState(true);
    setDragState({
      draggingDeviceId: device.id,
      draggedRowElement: row,
      dragMoved: false
    });
    row.dataset.dragging = "true";
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", device.id);
  };

  row.ondragend = async () => {
    const { dragMoved, draggedRowElement, draggingDeviceId } = getDragState();

    setDragState({
      draggingDeviceId: null,
      draggedRowElement: null,
      dragMoved: false
    });
    stopDragAutoScroll();
    setGlobalDragState(false);
    row.draggable = false;
    delete row.dataset.dragging;

    if (!dragMoved || !draggingDeviceId || !draggedRowElement) {
      return;
    }

    await persistDraggedRowOrder({
      deviceGrid,
      draggedRowElement,
      draggingDeviceId,
      onReorderDevice
    });
  };

  row.ondragover = (event) => {
    const { draggedRowElement, draggingDeviceId } = getDragState();
    if (!draggingDeviceId || draggingDeviceId === device.id || !draggedRowElement) {
      return;
    }

    event.preventDefault();
    updateDragAutoScroll(event.clientY);
    const beforeRects = captureDeviceRowRects(deviceGrid);
    const rect = row.getBoundingClientRect();
    const placement = event.clientY > rect.top + rect.height / 2 ? "after" : "before";

    if (moveDraggedRow(deviceGrid, draggedRowElement, row, placement)) {
      setDragState({ dragMoved: true });
      animateDeviceGridReflow(deviceGrid, beforeRects);
    }
  };

  row.ondrop = (event) => {
    const { draggingDeviceId } = getDragState();
    if (!draggingDeviceId || draggingDeviceId === device.id) {
      return;
    }

    event.preventDefault();
    stopDragAutoScroll();
  };
}
