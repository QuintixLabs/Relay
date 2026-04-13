/*
  public/js/hub/modules/spaces/index.js

  Renders spaces and opens the space-related dialogs.
*/

import { describeSpaceState, NO_SPACE_LABEL, renderAssignSpaceOptions, renderSpaceList } from "./base.js";

function setCopyWithStrong(copyElement, beforeText, strongText, afterText = "") {
  copyElement.textContent = "";

  if (beforeText) {
    copyElement.append(document.createTextNode(beforeText));
  }

  const strong = document.createElement("strong");
  strong.textContent = strongText;
  copyElement.append(strong);

  if (afterText) {
    copyElement.append(document.createTextNode(afterText));
  }
}

export function renderSpaces({
  currentDevices,
  currentSpaces,
  onDelete,
  onEdit,
  onSelect,
  sectionSubtitle,
  selectedSpace,
  spaceList,
  spaceTemplate
}) {
  sectionSubtitle.textContent = describeSpaceState(currentSpaces, currentDevices, selectedSpace);
  renderSpaceList({
    container: spaceList,
    template: spaceTemplate,
    spaces: currentSpaces,
    devices: currentDevices,
    selectedSpace,
    onSelect,
    onEdit,
    onDelete
  });
}

export function updateSpaceSelectionState({ currentDevices, currentSpaces, sectionSubtitle, selectedSpace, spaceList }) {
  sectionSubtitle.textContent = describeSpaceState(currentSpaces, currentDevices, selectedSpace);
  for (const item of spaceList.querySelectorAll(".space-item")) {
    item.dataset.selected = String(item.dataset.spaceId === selectedSpace);
  }
}

export function openDeleteDialog({ deleteTitle, deleteCopy, deleteDialog, device }) {
  deleteTitle.textContent = "Delete device";
  setCopyWithStrong(deleteCopy, "Delete ", device.name, " from Relay?");
  deleteDialog.showModal();
}

export function openSpaceDialog({
  editingSpaceTarget,
  space,
  spaceDialog,
  spaceDialogCopy,
  spaceDialogTitle,
  spaceForm,
  spaceFormMessage,
  spaceNameInput
}) {
  editingSpaceTarget.value = space;
  spaceForm.reset();
  spaceFormMessage.textContent = "";
  spaceDialogTitle.textContent = space ? "Edit space" : "Add space";
  spaceDialogCopy.textContent = space ? "Rename this space." : "Create a new space for your devices.";
  spaceNameInput.value = space?.name || "";
  spaceDialog.showModal();
  spaceNameInput.focus();
}

export function openSpaceDeleteDialog({
  deleteSpaceTarget,
  space,
  spaceDeleteTitle,
  spaceDeleteCopy,
  spaceDeleteDialog
}) {
  deleteSpaceTarget.value = space;
  spaceDeleteTitle.textContent = "Delete space";
  setCopyWithStrong(spaceDeleteCopy, "Delete ", space.name, "? Devices inside it will become unassigned.");
  spaceDeleteDialog.showModal();
}

export function openAssignSpaceDialog({
  assignSpaceTitle,
  assignSpaceCopy,
  assignSpaceDialog,
  assignSpaceMessage,
  assignSpaceOptions,
  assignSpaceTarget,
  currentSpaces,
  device
}) {
  assignSpaceTarget.value = device;
  assignSpaceTitle.textContent = "Move to space";
  setCopyWithStrong(assignSpaceCopy, "Choose a space for ", device.name, ".");
  assignSpaceMessage.textContent = "";
  renderAssignSpaceOptions({
    container: assignSpaceOptions,
    spaces: currentSpaces,
    selectedSpaceId: device.spaceId || ""
  });
  assignSpaceDialog.showModal();
}

export function getSpaceLabel(currentSpaces, spaceId) {
  if (!spaceId) {
    return NO_SPACE_LABEL;
  }

  return currentSpaces.find((space) => space.id === spaceId)?.name || NO_SPACE_LABEL;
}
