/*
  public/js/hub/modules/controllers/spaces.js

  Handles Hub space rendering, selection, and dialog openers.
*/

export function createSpacesController({
  applyCurrentSidebarState,
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
  renderDevices,
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
}) {
  function renderSpaces() {
    renderSpacesView({
      currentDevices: state.currentDevices,
      currentSpaces: state.currentSpaces,
      onDelete: openSpaceDeleteDialog,
      onEdit: openSpaceDialog,
      onSelect: handleSpaceSelect,
      sectionSubtitle,
      selectedSpace: state.selectedSpace,
      spaceList,
      spaceTemplate
    });
  }

  function handleSpaceSelect(spaceId) {
    if (spaceId === state.selectedSpace) {
      return;
    }

    state.selectedSpace = spaceId;
    setStoredValue(selectedSpaceStorageKey, state.selectedSpace);

    if (isMobileLayout()) {
      state.sidebarOpen = false;
    }

    applyCurrentSidebarState();
    updateSpaceSelectionState();
    renderDevices();
  }

  function updateSpaceSelectionState() {
    updateSpaceSelectionStateView({
      currentDevices: state.currentDevices,
      currentSpaces: state.currentSpaces,
      sectionSubtitle,
      selectedSpace: state.selectedSpace,
      spaceList
    });
  }

  function openDeleteDialog(device) {
    state.deleteTarget = device;
    openDeleteDialogView({ deleteTitle, deleteCopy, deleteDialog, device });
  }

  function openSpaceDialog(space = null) {
    openSpaceDialogView({
      editingSpaceTarget: {
        get value() {
          return state.editingSpaceTarget;
        },
        set value(next) {
          state.editingSpaceTarget = next;
        }
      },
      space,
      spaceDialog,
      spaceDialogCopy,
      spaceDialogTitle,
      spaceForm,
      spaceFormMessage,
      spaceNameInput
    });
  }

  function openSpaceDeleteDialog(space) {
    openSpaceDeleteDialogView({
      deleteSpaceTarget: {
        get value() {
          return state.deleteSpaceTarget;
        },
        set value(next) {
          state.deleteSpaceTarget = next;
        }
      },
      space,
      spaceDeleteTitle,
      spaceDeleteCopy,
      spaceDeleteDialog
    });
  }

  function openAssignSpaceDialog(device) {
    openAssignSpaceDialogView({
      assignSpaceTitle,
      assignSpaceCopy,
      assignSpaceDialog,
      assignSpaceMessage,
      assignSpaceOptions,
      assignSpaceTarget: {
        get value() {
          return state.assignSpaceTarget;
        },
        set value(next) {
          state.assignSpaceTarget = next;
        }
      },
      currentSpaces: state.currentSpaces,
      device
    });
  }

  function getSpaceLabel(spaceId) {
    return getSpaceLabelFromList(state.currentSpaces, spaceId);
  }

  return {
    getSpaceLabel,
    openAssignSpaceDialog,
    openDeleteDialog,
    openSpaceDeleteDialog,
    openSpaceDialog,
    renderSpaces,
    updateSpaceSelectionState
  };
}
