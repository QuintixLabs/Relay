/*
  public/js/settings/core/dom.js

  Collects the settings page elements in one place.
*/

export const settingsDom = {
  // Password dialog.
  confirmPasswordInput: document.querySelector("#confirm-password"),
  currentPasswordInput: document.querySelector("#current-password"),
  nextPasswordInput: document.querySelector("#next-password"),
  passwordDialogCopy: document.querySelector("#password-dialog-copy"),
  passwordDialog: document.querySelector("#password-dialog"),
  passwordEnvNote: document.querySelector("#password-env-note"),
  passwordFields: document.querySelector("#password-fields"),
  passwordForm: document.querySelector("#password-form"),
  passwordMessage: document.querySelector("#password-message"),
  passwordSubmitButton: document.querySelector("#password-submit"),
  cancelPasswordDialogButton: document.querySelector("#cancel-password-dialog"),
  openPasswordDialogButton: document.querySelector("#open-password-dialog"),

  // Backup controls.
  backupPasswordDialog: document.querySelector("#backup-password-dialog"),
  backupPasswordForm: document.querySelector("#backup-password-form"),
  backupPasswordInput: document.querySelector("#backup-password-input"),
  backupPasswordMessage: document.querySelector("#backup-password-message"),
  backupPasswordSubmitButton: document.querySelector("#backup-password-submit"),
  cancelBackupPasswordDialogButton: document.querySelector("#cancel-backup-password-dialog"),
  exportBackupButton: document.querySelector("#export-backup"),
  importBackupButton: document.querySelector("#import-backup"),
  importBackupInput: document.querySelector("#import-backup-input"),

  // Feedback settings.
  durationSelect: document.querySelector("#toast-duration"),
  feedbackInputs: Array.from(document.querySelectorAll('input[name="feedback-mode"]')),

  // Reset dialog.
  resetConfirmInput: document.querySelector("#reset-confirm-input"),
  resetDialog: document.querySelector("#reset-dialog"),
  resetForm: document.querySelector("#reset-form"),
  resetMessage: document.querySelector("#reset-message"),
  resetSubmitButton: document.querySelector("#reset-submit"),
  cancelResetDialogButton: document.querySelector("#cancel-reset-dialog"),
  openResetDialogButton: document.querySelector("#open-reset-dialog"),

  // Footer and update popover.
  copyrightLabel: document.querySelector("#settings-copyright"),
  poweredLabel: document.querySelector("#settings-powered"),
  updatePopover: document.querySelector("#update-popover"),
  updatePopoverCopy: document.querySelector("#update-popover-copy"),
  updatePopoverLink: document.querySelector("#update-popover-link"),
  updateTrigger: document.querySelector("#update-trigger"),
  updateWrap: document.querySelector("#update-wrap")
};
