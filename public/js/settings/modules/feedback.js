/*
  public/js/settings/modules/feedback.js

  Loads and saves the instance feedback settings.
*/

import { FEEDBACK_MODE_KEY, TOAST_DURATION_KEY } from "../../shared/constants.js";
import { normalizeAuthErrorMessage } from "../../shared/formatters.js";
import { setStoredValue } from "../../shared/storage.js";

const DEFAULT_SETTINGS = {
  feedbackDuration: 4000,
  feedbackMode: "inline"
};

export async function initializeFeedbackSettings({ durationSelect, feedbackInputs }) {
  const settings = await loadSettings();

  document.documentElement.dataset.feedbackMode = settings.feedbackMode;
  document.documentElement.dataset.feedbackDuration = String(settings.feedbackDuration);
  setStoredValue(FEEDBACK_MODE_KEY, settings.feedbackMode);
  setStoredValue(TOAST_DURATION_KEY, String(settings.feedbackDuration));

  for (const input of feedbackInputs) {
    input.checked = input.value === settings.feedbackMode;
    input.addEventListener("change", async () => {
      if (!input.checked) {
        return;
      }

      const nextSettings = {
        feedbackDuration: Number(durationSelect.value || settings.feedbackDuration),
        feedbackMode: input.value
      };

      document.documentElement.dataset.feedbackMode = nextSettings.feedbackMode;
      document.documentElement.dataset.feedbackDuration = String(nextSettings.feedbackDuration);
      setStoredValue(FEEDBACK_MODE_KEY, nextSettings.feedbackMode);
      setStoredValue(TOAST_DURATION_KEY, String(nextSettings.feedbackDuration));
      await saveSettings(nextSettings);
    });
  }

  durationSelect.value = String(settings.feedbackDuration);
  durationSelect.addEventListener("change", async () => {
    const selectedMode = feedbackInputs.find((input) => input.checked)?.value || settings.feedbackMode;
    const nextSettings = {
      feedbackDuration: Number(durationSelect.value),
      feedbackMode: selectedMode
    };

    document.documentElement.dataset.feedbackMode = nextSettings.feedbackMode;
    document.documentElement.dataset.feedbackDuration = String(nextSettings.feedbackDuration);
    setStoredValue(FEEDBACK_MODE_KEY, nextSettings.feedbackMode);
    setStoredValue(TOAST_DURATION_KEY, String(nextSettings.feedbackDuration));
    await saveSettings(nextSettings);
  });
}

async function loadSettings() {
  try {
    const response = await fetch("/api/settings", { credentials: "same-origin" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || `Request failed with ${response.status}`);
    }
    return payload.settings || DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(settings) {
  const response = await fetch("/api/settings", {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(settings)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(normalizeAuthErrorMessage(new Error(payload.error || ""), "Couldn't save settings."));
  }
}
