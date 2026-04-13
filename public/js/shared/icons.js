/*
  public/js/shared/icons.js

  Small helper for rendering local SVG icons without fucking Iconify.
*/

import { escapeHtml } from "./formatters.js";

export const ICON_ASSETS = {
  "relay:lock": "/assets/icons/ui/lock.svg",
  "relay:ko-fi": "/assets/icons/brand/ko-fi.svg",
  "relay:settings": "/assets/icons/ui/baseline-settings.svg",
  "relay:drag": "/assets/icons/ui/drag.svg",
  "relay:arrow-left": "/assets/icons/ui/arrow-left.svg",
  "relay:arrow-right": "/assets/icons/ui/arrow-right.svg",
  "relay:check": "/assets/icons/ui/check.svg",
  "relay:chevrons-up-down": "/assets/icons/ui/chevrons-up-down.svg",
  "relay:circle-alert": "/assets/icons/ui/circle-alert.svg",
  "relay:copy": "/assets/icons/ui/copy.svg",
  "relay:ellipsis": "/assets/icons/ui/ellipsis.svg",
  "relay:eye": "/assets/icons/ui/eye.svg",
  "relay:eye-off": "/assets/icons/ui/eye-off.svg",
  "relay:info": "/assets/icons/ui/info.svg",
  "relay:moon-star": "/assets/icons/ui/moon-star.svg",
  "relay:panels-top-left": "/assets/icons/ui/panels-top-left.svg",
  "relay:pencil-line": "/assets/icons/ui/pencil-line.svg",
  "relay:plus": "/assets/icons/ui/plus.svg",
  "relay:power": "/assets/icons/ui/power.svg",
  "relay:rotate-cw": "/assets/icons/ui/rotate-cw.svg",
  "relay:trash": "/assets/icons/ui/trash.svg",
  "relay:triangle-alert": "/assets/icons/ui/triangle-alert.svg",
  "relay:x": "/assets/icons/ui/x.svg",
  "relay:zap": "/assets/icons/ui/zap.svg",
  "relay:edit-outline-rounded": "/assets/icons/ui/edit-outline-rounded.svg",
  "relay:logout": "/assets/icons/ui/logout.svg",
  "relay:macos-apple": "/assets/icons/os/macos.svg",
  "relay:github": "/assets/icons/brand/github.svg",
  "relay:shield-lock-outline": "/assets/icons/ui/shield-lock-outline.svg",
  "relay:tux": "/assets/icons/os/linux.svg",
  "relay:search": "/assets/icons/ui/search-16.svg",
  "relay:sidebar": "/assets/icons/ui/sidebar.svg",
  "relay:windows": "/assets/icons/os/windows.svg",
  "relay:macos": "/assets/icons/os/macos.svg",
  "relay:unknown": "/assets/icons/os/unknown.svg"
};

export function getIconAsset(iconName) {
  return ICON_ASSETS[iconName] || "";
}

export function createIcon(iconName, className = "", label = "") {
  const element = document.createElement("span");
  element.className = ["icon", className].filter(Boolean).join(" ");
  setIcon(element, iconName, label);
  return element;
}

export function iconMarkup(iconName, className = "", label = "") {
  const asset = getIconAsset(iconName);
  const classes = ["icon", className].filter(Boolean).join(" ");
  const ariaHidden = label ? "" : ' aria-hidden="true"';
  const ariaLabel = label ? ` role="img" aria-label="${escapeHtml(label)}"` : "";
  return `<span class="${classes}" style="--icon:url('${asset}')"${ariaHidden}${ariaLabel}></span>`;
}

export function setIcon(element, iconName, label = "") {
  const asset = getIconAsset(iconName);
  element.classList.add("icon");
  element.style.setProperty("--icon", `url('${asset}')`);
  if (label) {
    element.setAttribute("role", "img");
    element.setAttribute("aria-label", label);
    element.removeAttribute("aria-hidden");
  } else {
    element.setAttribute("aria-hidden", "true");
    element.removeAttribute("role");
    element.removeAttribute("aria-label");
  }
}
