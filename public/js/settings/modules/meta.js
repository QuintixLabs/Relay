/*
  public/js/settings/modules/meta.js

  Loads version info, links, and the update popup in settings.
*/

function isUpdatePopoverOpen(updatePopover) {
  return updatePopover?.dataset.open === "true";
}

function setUpdatePopoverOpen(updatePopover, updateTrigger, open) {
  if (!updatePopover) {
    return;
  }

  updatePopover.dataset.open = open ? "true" : "false";
  updateTrigger?.setAttribute("aria-expanded", String(open));
}

function positionUpdatePopover(updatePopover, updateTrigger) {
  if (!updatePopover || !updateTrigger) {
    return;
  }

  const triggerRect = updateTrigger.getBoundingClientRect();
  const popoverRect = updatePopover.getBoundingClientRect();
  updatePopover.style.left = `${triggerRect.left + triggerRect.width / 2}px`;
  updatePopover.style.top = `${triggerRect.top - popoverRect.height - 12}px`;
}

export function initializeMetaSettings({
  copyrightLabel,
  poweredLabel,
  updatePopover,
  updatePopoverCopy,
  updatePopoverLink,
  updateTrigger,
  updateWrap
}) {
  if (copyrightLabel) {
    copyrightLabel.textContent = `© ${new Date().getFullYear()}`;
  }

  updateTrigger?.addEventListener("click", (event) => {
    if (!updatePopover) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const nextOpen = !isUpdatePopoverOpen(updatePopover);
    setUpdatePopoverOpen(updatePopover, updateTrigger, nextOpen);

    if (nextOpen) {
      requestAnimationFrame(() => {
        positionUpdatePopover(updatePopover, updateTrigger);
      });
    }
  });

  window.addEventListener("scroll", () => {
    if (isUpdatePopoverOpen(updatePopover)) {
      positionUpdatePopover(updatePopover, updateTrigger);
    }
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (isUpdatePopoverOpen(updatePopover)) {
      positionUpdatePopover(updatePopover, updateTrigger);
    }
  });

  updatePopover?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", (event) => {
    if (!updateWrap || !updatePopover || !isUpdatePopoverOpen(updatePopover)) {
      return;
    }

    if (!updateWrap.contains(event.target)) {
      setUpdatePopoverOpen(updatePopover, updateTrigger, false);
    }
  });

  void loadMeta({
    poweredLabel,
    updatePopover,
    updatePopoverCopy,
    updatePopoverLink,
    updateTrigger,
    updateWrap
  });
}

async function loadMeta({
  poweredLabel,
  updatePopover,
  updatePopoverCopy,
  updatePopoverLink,
  updateTrigger,
  updateWrap
}) {
  try {
    const response = await fetch("/api/meta");
    const payload = await response.json();
    if (!response.ok) {
      return;
    }

    if (poweredLabel) {
      poweredLabel.textContent = `Powered by Relay • v${payload.version || "0.0.0"}`;
    }

    const latestVersion = payload.latestVersion || payload.version || "0.0.0";
    const releasesUrl = payload.releasesUrl || "#";
    const outdated = isVersionOlder(payload.version || "0.0.0", latestVersion);

    if (updateWrap && updatePopover && updatePopoverCopy && updatePopoverLink) {
      updateWrap.dataset.visible = String(outdated);
      setUpdatePopoverOpen(updatePopover, updateTrigger, false);
      updatePopoverCopy.textContent = `Current ${payload.version || "0.0.0"} · Latest ${latestVersion}`;
      updatePopoverLink.href = releasesUrl;
    }

  } catch {
    // Keep the settings page usable even if the version check fails.
  }
}

function isVersionOlder(current, latest) {
  const currentParts = String(current).split(".").map((part) => Number(part) || 0);
  const latestParts = String(latest).split(".").map((part) => Number(part) || 0);
  const length = Math.max(currentParts.length, latestParts.length);

  for (let index = 0; index < length; index += 1) {
    const currentValue = currentParts[index] || 0;
    const latestValue = latestParts[index] || 0;

    if (currentValue < latestValue) return true;
    if (currentValue > latestValue) return false;
  }

  return false;
}
