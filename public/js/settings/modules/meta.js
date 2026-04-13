/*
  public/js/settings/modules/meta.js

  Loads version info, links, and the update popup in settings.
*/

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

  updateTrigger?.addEventListener("click", () => {
    const open = updatePopover.hidden;
    updatePopover.hidden = !open;
    updateTrigger.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (event) => {
    if (!updateWrap || !updatePopover || updatePopover.hidden) {
      return;
    }

    if (!updateWrap.contains(event.target)) {
      updatePopover.hidden = true;
      updateTrigger?.setAttribute("aria-expanded", "false");
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
      updatePopover.hidden = true;
      updateTrigger?.setAttribute("aria-expanded", "false");
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
