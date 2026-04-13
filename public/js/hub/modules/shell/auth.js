/*
  public/js/hub/modules/shell/auth.js

  Controls the Hub auth screen, messages, and auth flow wiring.
 */

// --------------------------------------------------------------------------
// Auth screen controller
// --------------------------------------------------------------------------
export function createAuthController({
  authScreen,
  authFormContent,
  authSetupBlocked,
  authSubtitle,
  hub,
  authMessage,
  loginSubmitButton,
  rememberDeviceInput,
  setupConfirmInput,
  setupSubmitButton,
  setupConfirmWrap,
  tokenInput,
  submitButton
}) {

let clearMessageTimer = 0;

function clearMessageTimerIfNeeded() {
  if (!clearMessageTimer) {
    return;
  }

  clearTimeout(clearMessageTimer);
  clearMessageTimer = 0;
}

function getAuthMessageTone(message) {
  const lower = String(message || "").toLowerCase();

  if (
    lower.includes("enter a password") ||
    lower.includes("use at least 8 characters") ||
    lower.includes("passwords do not match") ||
    lower.includes("wrong password") ||
    lower.includes("try again") ||
    lower.includes("too many") ||
    lower.includes("unauthorized")
  ) {
    return "error";
  }

  return "default";
}

function setUnlocked(unlocked) {
  document.documentElement.dataset.session = unlocked ? "unlocked" : "locked";
  authScreen.hidden = unlocked;
  hub.hidden = !unlocked;
}

function setSetupMode(enabled) {
  document.documentElement.dataset.authMode = enabled ? "setup" : "login";
  if (authSubtitle) {
    authSubtitle.textContent = enabled ? "Set up your instance" : "Log in";
  }
  if (tokenInput) {
    tokenInput.placeholder = enabled ? "Create password" : "Password";
    tokenInput.autocomplete = enabled ? "new-password" : "current-password";
  }
  if (setupConfirmWrap) {
    setupConfirmWrap.hidden = !enabled;
  }
  if (loginSubmitButton) {
    loginSubmitButton.hidden = enabled;
  }
  if (setupSubmitButton) {
    setupSubmitButton.hidden = !enabled;
  }
  if (setupConfirmInput) {
    setupConfirmInput.value = "";
  }
}

function setSetupBlocked(blocked) {
  if (authSetupBlocked) {
    authSetupBlocked.hidden = !blocked;
  }

  if (authFormContent) {
    authFormContent.hidden = blocked;
  }
}

function setAuthMessage(message) {
  clearMessageTimerIfNeeded();

  if (authMessage.textContent === message) {
    authMessage.dataset.tone = getAuthMessageTone(message);
    authMessage.dataset.visible = "true";
    return;
  }

  authMessage.textContent = message;
  authMessage.dataset.tone = getAuthMessageTone(message);
  authMessage.getBoundingClientRect();
  requestAnimationFrame(() => {
    authMessage.dataset.visible = "true";
  });
}

function clearAuthMessage() {
  clearMessageTimerIfNeeded();

  authMessage.dataset.visible = "false";
  if (!authMessage.textContent) {
    authMessage.dataset.tone = "default";
    return;
  }

  clearMessageTimer = window.setTimeout(() => {
    if (authMessage.dataset.visible !== "true") {
      authMessage.textContent = "";
      authMessage.dataset.tone = "default";
    }
    clearMessageTimer = 0;
  }, 180);
}

function resetAuthMessage() {
  clearMessageTimerIfNeeded();

  authMessage.dataset.visible = "false";
  authMessage.dataset.tone = "default";
  authMessage.textContent = "";
}

function setAuthPending(pending) {
  tokenInput.disabled = pending;
  submitButton.disabled = pending;
  if (rememberDeviceInput) {
    rememberDeviceInput.disabled = pending;
  }
  if (setupConfirmInput) {
    setupConfirmInput.disabled = pending;
  }
  if (setupSubmitButton) {
    setupSubmitButton.disabled = pending;
  }
}

return {
  clearAuthMessage,
  resetAuthMessage,
  setAuthMessage,
  setAuthPending,
  setSetupMode,
  setSetupBlocked,
  setUnlocked
};
}

// --------------------------------------------------------------------------
// Hub auth wiring
// --------------------------------------------------------------------------
export function bindHubAuth({
appState,
auth,
clearAuthToken,
clearSearch,
deviceGrid,
forgetButton,
loadDevices,
rememberDeviceInput,
setupConfirmInput,
spaceAll,
tokenInput,
tokenForm,
toggleSetupConfirmButton,
toggleTokenButton
}) {
let initialLoadPromise = Promise.resolve();

// ------------------------------------------------------------------------
// Auth state helpers
// ------------------------------------------------------------------------
function setAuthPending(nextValue) {
  appState.authPending = nextValue;
  auth.setAuthPending(nextValue);
}

// ------------------------------------------------------------------------
// Startup state
// ------------------------------------------------------------------------
auth.setSetupMode(appState.setupRequired);
auth.setSetupBlocked(Boolean(appState.setupRequired && appState.setupBlocked));
auth.setUnlocked(false);

if (!appState.setupRequired) {
  initialLoadPromise = loadDevices({ fromStoredToken: true });
}

// ------------------------------------------------------------------------
// Auth submit flows
// ------------------------------------------------------------------------
async function handleSetupSubmit(password) {
  const response = await fetch("/api/setup", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      password,
      confirmPassword: setupConfirmInput?.value.trim() || "",
      remember: Boolean(rememberDeviceInput?.checked)
    })
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  appState.setupRequired = false;

  const ok = await loadDevices();
  if (ok) {
    auth.setSetupMode(false);
  }
}

async function handleLoginSubmit(password) {
  const response = await fetch("/api/login", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      password,
      remember: Boolean(rememberDeviceInput?.checked)
    })
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  const ok = await loadDevices();
  if (ok) {
    auth.clearAuthMessage();
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (appState.authPending) {
    return;
  }

  const password = tokenInput.value.trim();
  setAuthPending(true);

  try {
    if (appState.setupRequired) {
      await handleSetupSubmit(password);
      return;
    }

    await handleLoginSubmit(password);
  } catch (error) {
    auth.setAuthMessage(
      error.message || (appState.setupRequired ? "Couldn't finish setup." : "Couldn't log in.")
    );
  } finally {
    setAuthPending(false);
  }
}

// ------------------------------------------------------------------------
// Field helpers
// ------------------------------------------------------------------------
function togglePasswordField(input, button) {
  const hidden = input?.type === "password";

  if (input) {
    input.type = hidden ? "text" : "password";
  }

  button.innerHTML = hidden
    ? '<span class="icon" style="--icon:url(\'/assets/icons/ui/eye-off.svg\')" aria-hidden="true"></span>'
    : '<span class="icon" style="--icon:url(\'/assets/icons/ui/eye.svg\')" aria-hidden="true"></span>';
}

// ------------------------------------------------------------------------
// Logout reset
// ------------------------------------------------------------------------
function resetLoggedOutState() {
  appState.currentDevices = [];
  appState.currentSpaces = [];
  appState.selectedSpace = spaceAll;
  appState.commandSearchQuery = "";
  deviceGrid.innerHTML = "";

  clearAuthToken();
  tokenInput.value = "";
  clearSearch?.();
  auth.clearAuthMessage();
  auth.setUnlocked(false);

  if (rememberDeviceInput) {
    rememberDeviceInput.checked = false;
  }

  if (setupConfirmInput) {
    setupConfirmInput.value = "";
  }
}

// ------------------------------------------------------------------------
// Event binding
// ------------------------------------------------------------------------
tokenForm.addEventListener("submit", handleAuthSubmit);
tokenForm.addEventListener("input", (event) => {
  if (event.target === tokenInput || event.target === setupConfirmInput) {
    auth.clearAuthMessage();
  }
});
tokenForm.addEventListener("change", (event) => {
  if (event.target === tokenInput || event.target === setupConfirmInput) {
    auth.clearAuthMessage();
  }
});

toggleTokenButton.addEventListener("click", () => {
  togglePasswordField(tokenInput, toggleTokenButton);
});

toggleSetupConfirmButton?.addEventListener("click", () => {
  togglePasswordField(setupConfirmInput, toggleSetupConfirmButton);
});

forgetButton.addEventListener("click", () => {
  void fetch("/api/logout", {
    method: "POST",
    credentials: "same-origin"
  }).finally(() => {
    resetLoggedOutState();
  });
});

return {
  initialLoadPromise
};
}
