/*
  public/js/hub/core/dom.js

  Collects the Hub page elements in one place.
*/

export const dom = {
  // Login
  tokenForm: document.querySelector("#token-form"),
  tokenInput: document.querySelector("#token"),
  rememberDeviceInput: document.querySelector("#remember-device"),
  loginSubmitButton: document.querySelector("#login-submit-button"),
  setupSubmitButton: document.querySelector("#setup-submit-button"),
  setupConfirmInput: document.querySelector("#setup-confirm"),
  setupConfirmWrap: document.querySelector("#setup-confirm-wrap"),
  toggleSetupConfirmButton: document.querySelector("#toggle-setup-confirm"),
  forgetButton: document.querySelector("#forget-token"),
  hub: document.querySelector("#hub"),
  authScreen: document.querySelector("#auth-screen"),
  authSubtitle: document.querySelector("#auth-subtitle"),
  authFormContent: document.querySelector("#auth-form-content"),
  authSetupBlocked: document.querySelector("#auth-setup-blocked"),
  toggleTokenButton: document.querySelector("#toggle-token"),
  authMessage: document.querySelector("#auth-message"),

  // Messages
  banner: document.querySelector("#banner"),
  liveRegion: document.querySelector("#live-region"),
  toastStack: document.querySelector("#toast-stack"),

  // Main layout
  sidebarScrim: document.querySelector("#sidebar-scrim"),
  sectionSubtitle: document.querySelector("#section-subtitle"),
  spaceStatus: document.querySelector("#space-status"),
  hubLayout: document.querySelector("#hub-layout"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  closeSidebarButton: document.querySelector("#close-sidebar"),

  // Spaces and devices
  spaceList: document.querySelector("#space-list"),
  deviceSearchTrigger: document.querySelector("#device-search-trigger"),
  deviceSearchDialog: document.querySelector("#device-search-dialog"),
  deviceSearchInput: document.querySelector("#device-search-input"),
  closeDeviceSearchButton: document.querySelector("#close-device-search"),
  deviceSearchResults: document.querySelector("#device-search-results"),
  deviceCountValue: document.querySelector("#device-count-value"),
  deviceGrid: document.querySelector("#device-grid"),
  spaceTemplate: document.querySelector("#space-template"),
  deviceTemplate: document.querySelector("#device-template"),
  addDeviceButton: document.querySelector("#add-device"),
  addSpaceButton: document.querySelector("#add-space"),

  // Top menu
  menu: document.querySelector("[data-menu]"),
  menuTrigger: document.querySelector("#menu-trigger"),
  menuPanel: document.querySelector("#menu-panel"),

  // Add device
  deviceDialog: document.querySelector("#device-dialog"),
  deviceForm: document.querySelector("#device-form"),
  cancelDeviceFormButton: document.querySelector("#cancel-device-form"),
  deviceDialogTitle: document.querySelector("#device-dialog-title"),
  deviceDialogCopy: document.querySelector("#device-dialog-copy"),
  deviceSubmitButton: document.querySelector("#device-submit-button"),
  toggleDeviceTokenButton: document.querySelector("#toggle-device-token"),
  unlockDeviceTokenWrap: document.querySelector("#unlock-device-token-wrap"),
  unlockDeviceTokenButton: document.querySelector("#unlock-device-token"),
  deviceFormMessage: document.querySelector("#device-form-message"),
  deviceSecretDialog: document.querySelector("#device-secret-dialog"),
  deviceSecretForm: document.querySelector("#device-secret-form"),
  deviceSecretTitle: document.querySelector("#device-secret-title"),
  deviceSecretCopy: document.querySelector("#device-secret-copy"),
  deviceSecretPasswordInput: document.querySelector("#device-secret-password"),
  toggleDeviceSecretPasswordButton: document.querySelector("#toggle-device-secret-password"),
  deviceSecretMessage: document.querySelector("#device-secret-message"),
  cancelDeviceSecretButton: document.querySelector("#cancel-device-secret"),

  // Delete device
  deleteDialog: document.querySelector("#delete-dialog"),
  deleteForm: document.querySelector("#delete-form"),
  deleteTitle: document.querySelector("#delete-title"),
  deleteCopy: document.querySelector("#delete-copy"),
  cancelDeleteButton: document.querySelector("#cancel-delete"),

  // Add or edit space
  spaceDialog: document.querySelector("#space-dialog"),
  spaceForm: document.querySelector("#space-form"),
  spaceNameInput: document.querySelector("#space-name"),
  spaceFormMessage: document.querySelector("#space-form-message"),
  spaceDialogTitle: document.querySelector("#space-dialog-title"),
  spaceDialogCopy: document.querySelector("#space-dialog-copy"),
  cancelSpaceButton: document.querySelector("#cancel-space"),

  // Delete space
  spaceDeleteDialog: document.querySelector("#space-delete-dialog"),
  spaceDeleteForm: document.querySelector("#space-delete-form"),
  spaceDeleteTitle: document.querySelector("#space-delete-title"),
  spaceDeleteCopy: document.querySelector("#space-delete-copy"),
  cancelSpaceDeleteButton: document.querySelector("#cancel-space-delete"),

  // Move device to space
  assignSpaceDialog: document.querySelector("#assign-space-dialog"),
  assignSpaceForm: document.querySelector("#assign-space-form"),
  assignSpaceTitle: document.querySelector("#assign-space-title"),
  assignSpaceCopy: document.querySelector("#assign-space-copy"),
  assignSpaceOptions: document.querySelector("#assign-space-options"),
  assignSpaceMessage: document.querySelector("#assign-space-message"),
  cancelAssignSpaceButton: document.querySelector("#cancel-assign-space")
};
