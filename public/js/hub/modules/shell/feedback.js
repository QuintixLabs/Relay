/*
  public/js/hub/modules/shell/feedback.js

  Shows page messages as inline notices, banners, or toasts.
*/

import { iconMarkup } from "../../../shared/icons.js";

export function createFeedbackController({ banner, liveRegion, toastStack }) {
  const activeToasts = new Set();
  let stackHovered = false;

  function pauseAllToasts() {
    for (const toast of activeToasts) {
      toast.pause();
    }
  }

  function resumeAllToasts() {
    for (const toast of activeToasts) {
      toast.resume();
    }
  }

  toastStack.addEventListener("mouseenter", () => {
    stackHovered = true;
    pauseAllToasts();
  });

  toastStack.addEventListener("mouseleave", () => {
    stackHovered = false;
    resumeAllToasts();
  });

  function announce(message) {
    liveRegion.textContent = "";
    requestAnimationFrame(() => {
      liveRegion.textContent = message;
    });
  }

  function showBanner(message) {
    banner.textContent = message;
    banner.hidden = false;
    announce(message);
  }

  function hideBanner() {
    banner.hidden = true;
    banner.textContent = "";
  }

  function setDeviceStatus(element, message, tone) {
    clearTimeout(Number(element.dataset.timeoutId || 0));
    clearTimeout(Number(element.dataset.hideTimerId || 0));
    element.textContent = message;
    element.dataset.tone = tone;
    element.dataset.visible = "false";
  }

  function clearDeviceStatus(element) {
    clearTimeout(Number(element.dataset.timeoutId || 0));
    clearTimeout(Number(element.dataset.hideTimerId || 0));
    element.dataset.tone = "";
    element.dataset.visible = "false";
    element.textContent = "";
  }

  function fadeOutDeviceStatus(element) {
    element.dataset.visible = "false";
    const hideTimer = setTimeout(() => {
      element.dataset.tone = "";
      element.textContent = "";
      delete element.dataset.timeoutId;
      delete element.dataset.hideTimerId;
    }, 180);
    element.dataset.hideTimerId = String(hideTimer);
  }

  function reportFeedback(statusElement, message, tone) {
    announce(message);
    const feedbackMode = document.documentElement.dataset.feedbackMode || "inline";
    const duration = Number(document.documentElement.dataset.feedbackDuration || "4000");

    if (feedbackMode === "toast") {
      clearDeviceStatus(statusElement);
      showToast(message, tone, duration);
      return;
    }

    setDeviceStatus(statusElement, message, tone);
    statusElement.getBoundingClientRect();
    requestAnimationFrame(() => {
      statusElement.dataset.visible = "true";
    });
    const timeoutId = setTimeout(() => fadeOutDeviceStatus(statusElement), duration);
    statusElement.dataset.timeoutId = String(timeoutId);
  }

  function showToast(message, tone, duration) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${tone}`;
    const progress = document.createElement("span");
    progress.className = "toast-progress";

    const progressBar = document.createElement("span");
    progressBar.className = "toast-progress-bar";
    progress.append(progressBar);

    const icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.innerHTML = getToastIcon(tone);

    const body = document.createElement("span");
    body.className = "toast-body";

    const copy = document.createElement("span");
    copy.className = "toast-copy";
    copy.textContent = message;
    body.append(copy);

    toast.append(progress, icon, body);

    let remaining = duration;
    let dismissed = false;
    let frameId = 0;
    let timeoutId = 0;
    let resumeStartedAt = performance.now();

    const tick = () => {
      const elapsed = performance.now() - resumeStartedAt;
      const left = Math.max(remaining - elapsed, 0);
      progressBar.style.transform = `scaleX(${left / duration})`;
      if (left > 0 && !dismissed) {
        frameId = requestAnimationFrame(tick);
      }
    };

    const pause = () => {
      if (dismissed) {
        return;
      }
      clearTimeout(timeoutId);
      cancelAnimationFrame(frameId);
      remaining = Math.max(remaining - (performance.now() - resumeStartedAt), 0);
    };

    const resume = () => {
      if (dismissed) {
        return;
      }
      resumeStartedAt = performance.now();
      timeoutId = setTimeout(hideToast, remaining);
      frameId = requestAnimationFrame(tick);
    };

    const hideToast = () => {
      dismissed = true;
      clearTimeout(timeoutId);
      cancelAnimationFrame(frameId);
      toast.dataset.visible = "false";
      activeToasts.delete(controls);
      setTimeout(() => toast.remove(), 180);
    };

    toastStack.appendChild(toast);
    const controls = { pause, resume };
    activeToasts.add(controls);
    toast.getBoundingClientRect();
    requestAnimationFrame(() => {
      toast.dataset.visible = "true";
    });
    progressBar.style.transform = "scaleX(1)";
    if (stackHovered) {
      pause();
    } else {
      resume();
    }
  }

  return {
    showBanner,
    hideBanner,
    reportFeedback,
    setDeviceStatus,
    clearDeviceStatus
  };
}

function getToastIcon(tone) {
  switch (tone) {
    case "success":
      return iconMarkup("relay:check");
    case "error":
      return iconMarkup("relay:circle-alert");
    default:
      return iconMarkup("relay:info");
  }
}
