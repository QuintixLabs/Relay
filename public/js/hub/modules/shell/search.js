/*
  public/js/hub/modules/shell/search.js

  Handles the Hub command palette search UI and interactions.
*/

import { ICONS, OS_LABELS } from "../../../shared/constants.js";
import { enhanceDialog } from "../../../shared/dialogs.js";
import { createIcon, setIcon } from "../../../shared/icons.js";
import { NO_SPACE_LABEL, SPACE_ALL } from "../spaces/base.js";

export function bindDeviceSearch({
  appState,
  closeButton,
  dialog,
  input,
  jumpToDevice,
  results,
  trigger
}) {

let activeSearchIndex = 0;
let pendingJumpDevice = null;

const searchDialogController = enhanceDialog(dialog, {
  shouldLockScroll() {
    return true;
  }
});

// --------------------------------------------------------------------------
// Search state helpers
// --------------------------------------------------------------------------
function clearSearchState({ blurInput = false } = {}) {
  appState.commandSearchQuery = "";
  activeSearchIndex = 0;

  if (!input) {
    return;
  }

  input.value = "";

  if (blurInput) {
    input.blur();
  }
}

function getSearchResults() {
  const query = appState.commandSearchQuery.trim().toLowerCase();

  if (!query) {
    return [];
  }

  return appState.currentDevices
    .map((device, index) => ({ device, index, score: getSearchScore(device, query) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.device);
}

function getSearchScore(device, query) {
  const name = String(device.name || "").toLowerCase();
  const id = String(device.id || "").toLowerCase();
  const host = String(device.host || "").toLowerCase();
  const port = String(device.port || "").toLowerCase();
  const hostPort = host && port ? `${host}:${port}` : host;
  const spaceId = String(device.spaceId || "").toLowerCase();
  const spaceLabel = getSpaceSearchLabel(device);
  const spaceAliases = getSpaceAliases(device);
  const osLabel = String(OS_LABELS[device.os] || device.os || "").toLowerCase();
  const osAliases = getOsAliases(device.os);
  const searchTerms = [name, id, host, port, hostPort, spaceId, spaceLabel, ...spaceAliases, osLabel, ...osAliases];
  const ipLikeQuery = /^[\d.:]+$/.test(query) && /[.:]/.test(query);

  if (!searchTerms.some((term) => term.includes(query))) {
    return 0;
  }

// made search results based on scores
const scores = [
  rankSearchTerm(name, query, { exact: 1000, startsWith: 840, includes: 500 }),
  rankSearchTerm(id, query, { exact: 920, startsWith: 780, includes: 440 }),
  rankSearchTerm(host, query, { exact: 720, startsWith: 660, includes: 380 }),
  rankSearchTerm(port, query, { exact: 720, startsWith: 660, includes: 380 }),
  rankSearchTerm(spaceId, query, { exact: 560, includes: 260 }),
  rankSearchTerm(osLabel, query, { exact: 620, includes: 320 }),
  rankSearchTerm(spaceLabel, query, { exact: 600, includes: 300 }),
  ...osAliases.map((alias) => rankSearchTerm(alias, query, { exact: 620, includes: 320 })),
  ...spaceAliases.map((alias) => rankSearchTerm(alias, query, { exact: 600, includes: 300 }))
];

if (ipLikeQuery) {
  scores.push(
    rankSearchTerm(hostPort, query, { exact: 1080, startsWith: 980, includes: 900 }),
    rankSearchTerm(host, query, { exact: 1000, startsWith: 920, includes: 840 }),
    rankSearchTerm(port, query, { exact: 760, startsWith: 700, includes: 700 })
  );
}

  return Math.max(...scores, 120);
}

function rankSearchTerm(value, query, { exact = 0, startsWith = 0, includes = 0 } = {}) {
  if (!value) {
    return 0;
  }

  if (value === query) {
    return exact;
  }

  if (startsWith && value.startsWith(query)) {
    return startsWith;
  }

  if (includes && value.includes(query)) {
    return includes;
  }

  return 0;
}

// os aliases in search results cuz yeah :)
function getOsAliases(os) {
  switch (String(os || "").toLowerCase()) {
    case "macos":
      return ["mac", "macos", "osx", "apple"];
    case "windows":
      return ["windows", "win"];
    case "linux":
      return ["linux", "tux", "penguin"];
    case "unknown":
      return ["unknown"];
    default:
      return [];
  }
}

function getSpaceSearchLabel(device) {
  if (!device.spaceId) {
    return NO_SPACE_LABEL.toLowerCase();
  }

  return String(
    appState.currentSpaces.find((entry) => entry.id === device.spaceId)?.name || device.spaceId || SPACE_ALL
  ).toLowerCase();
}

function getSpaceAliases(device) {
  if (!device.spaceId) {
    return [NO_SPACE_LABEL.toLowerCase(), "all devices", "unassigned", "none"];
  }

  return [];
}

function getRenderedSearchRows() {
  return Array.from(results?.querySelectorAll(".command-search-result") || []);
}

function setSearchNavigationMode(mode) {
  if (!results) {
    return;
  }

  results.dataset.navigation = mode;
}

function queueDeviceJump(device) {
  clearSearchState();
  pendingJumpDevice = device;
  searchDialogController.close();
}

// --------------------------------------------------------------------------
// Result row rendering
// --------------------------------------------------------------------------
function ensureResultRow(device, index, existingRows) {
  const deviceId = String(device.id);
  const button = existingRows.get(deviceId) || document.createElement("button");

  button.type = "button";
  button.className = "command-search-result";
  button.dataset.deviceId = deviceId;
  button.dataset.spaceId = device.spaceId || "";
  button.dataset.active = String(index === activeSearchIndex);

  syncResultLead(button, device);
  syncResultCopy(button, device);

  return button;
}

function syncResultLead(button, device) {
  let lead = button.querySelector(".command-search-result-lead");
  if (!lead) {
    lead = document.createElement("span");
    lead.className = "command-search-result-lead";
    button.append(lead);
  }

  let osIcon = lead.querySelector(".command-search-result-os");
  if (!osIcon) {
    osIcon = createIcon(ICONS[device.os] || ICONS.unknown, "command-search-result-os");
    lead.append(osIcon);
  }

  setIcon(osIcon, ICONS[device.os] || ICONS.unknown);
  osIcon.classList.toggle("command-search-result-os-macos", device.os === "macos");
}

function syncResultCopy(button, device) {
  let copy = button.querySelector(".command-search-result-copy");
  if (!copy) {
    copy = document.createElement("span");
    copy.className = "command-search-result-copy";
    button.append(copy);
  }

  syncResultName(copy, device);
  syncResultMeta(copy, device);
  syncResultSpace(copy, device);
}

function syncResultName(copy, device) {
  let name = copy.querySelector(".command-search-result-name");
  if (!name) {
    name = document.createElement("span");
    name.className = "command-search-result-name";
    copy.append(name);
  }

  name.textContent = device.name;
}

function syncResultMeta(copy, device) {
  let meta = copy.querySelector(".command-search-result-meta");
  if (!meta) {
    meta = document.createElement("span");
    meta.className = "command-search-result-meta";
    copy.append(meta);
  }

  meta.textContent = `${OS_LABELS[device.os] || device.os} · ${device.host}:${device.port}`;
}

function syncResultSpace(copy, device) {
  let space = copy.querySelector(".command-search-result-space");
  if (!space) {
    space = document.createElement("span");
    space.className = "command-search-result-space";
    const spaceIcon = createIcon("relay:panels-top-left");
    const spaceLabel = document.createElement("span");
    space.append(spaceIcon, spaceLabel);
    copy.append(space);
  }

  const spaceIcon = space.querySelector(".icon");
  if (spaceIcon) {
    setIcon(spaceIcon, "relay:panels-top-left");
  }

  const spaceLabel = space.querySelector("span:not(.icon)");
  spaceLabel.textContent = appState.currentSpaces.find((entry) => entry.id === device.spaceId)?.name || "No space";
}

function renderEmptyResults() {
  results.textContent = "";

  const empty = document.createElement("p");
  empty.className = "command-search-empty";
  empty.textContent = "No devices match your search.";

  results.append(empty);
  results.dataset.visible = "true";
}

function renderSearchResults() {
  if (!results) {
    return;
  }

  const matches = getSearchResults();
  activeSearchIndex = Math.min(activeSearchIndex, Math.max(matches.length - 1, 0));
  results.dataset.visible = "false";

  if (!appState.commandSearchQuery.trim()) {
    results.textContent = "";
    return;
  }

  if (matches.length === 0) {
    renderEmptyResults();
    return;
  }

  results.querySelector(".command-search-empty")?.remove();

  const existingRows = new Map(
    Array.from(results.querySelectorAll(".command-search-result"), (row) => [
      row.dataset.deviceId,
      row
    ])
  );
  const visibleIds = new Set(matches.map((device) => String(device.id)));

  for (const [index, device] of matches.entries()) {
    results.append(ensureResultRow(device, index, existingRows));
  }

  for (const [deviceId, row] of existingRows) {
    if (visibleIds.has(deviceId)) {
      row.hidden = false;
      continue;
    }

    row.remove();
  }

  results.dataset.visible = "true";
  updateActiveSearchResult();
}

// --------------------------------------------------------------------------
// Active result state
// --------------------------------------------------------------------------
function updateActiveSearchResult({ shouldScroll = true } = {}) {
  if (!results) {
    return;
  }

  const rows = getRenderedSearchRows();

  rows.forEach((row, index) => {
    row.dataset.active = String(index === activeSearchIndex);
  });

  const activeRow = rows[activeSearchIndex];
  if (!activeRow || !shouldScroll) {
    return;
  }

  const containerStyles = window.getComputedStyle(results);
  const paddingTop = Number.parseFloat(containerStyles.paddingTop || "0") || 0;
  const paddingBottom = Number.parseFloat(containerStyles.paddingBottom || "0") || 0;
  const offset = 8;
  const rowTop = activeRow.offsetTop;
  const rowBottom = rowTop + activeRow.offsetHeight;
  const viewTop = results.scrollTop + paddingTop;
  const viewBottom = results.scrollTop + results.clientHeight - paddingBottom;

  if (rowTop - offset < viewTop) {
    results.scrollTop = Math.max(0, rowTop - paddingTop - offset);
    return;
  }

  if (rowBottom + offset > viewBottom) {
    results.scrollTop = rowBottom - results.clientHeight + paddingBottom + offset;
  }
}

function moveActiveResult(direction) {
  const rows = getRenderedSearchRows();
  if (rows.length === 0) {
    return;
  }

  setSearchNavigationMode("keyboard");
  activeSearchIndex =
    direction === "down"
      ? Math.min(activeSearchIndex + 1, rows.length - 1)
      : Math.max(activeSearchIndex - 1, 0);
  updateActiveSearchResult();
}

// --------------------------------------------------------------------------
// Dialog visibility
// --------------------------------------------------------------------------
function openDeviceSearch() {
  if (!dialog.open) {
    dialog.showModal();
  }

  renderSearchResults();
  requestAnimationFrame(() => {
    input?.focus();
  });
}

function closeDeviceSearch() {
  clearSearchState({ blurInput: true });
  renderSearchResults();
  searchDialogController.close();
  requestAnimationFrame(() => {
    trigger?.blur();
  });
}

function handleDialogClose() {
  clearSearchState();
  renderSearchResults();

  requestAnimationFrame(() => {
    trigger?.blur();
  });
  window.setTimeout(() => {
    trigger?.blur();
  }, 0);

  if (!pendingJumpDevice) {
    return;
  }

  const device = pendingJumpDevice;
  pendingJumpDevice = null;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      jumpToDevice(device);
    });
  });
}

// --------------------------------------------------------------------------
// Event binding
// --------------------------------------------------------------------------
dialog.addEventListener("close", handleDialogClose);

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    closeDeviceSearch();
  }
});

trigger?.addEventListener("click", openDeviceSearch);
closeButton?.addEventListener("click", closeDeviceSearch);

input?.addEventListener("input", () => {
  appState.commandSearchQuery = input.value;
  activeSearchIndex = 0;
  renderSearchResults();
});

// escape 
input?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeDeviceSearch();
    return;
  }

  // arrow down
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveActiveResult("down");
    return;
  }
  // arrow up
  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveActiveResult("up");
    return;
  }
  // enter
  if (event.key !== "Enter") {
    return;
  }

  const matches = getSearchResults();
  if (matches.length === 0) {
    return;
  }

  event.preventDefault();
  jumpToDevice(matches[activeSearchIndex]);
  searchDialogController.close();
});

results?.addEventListener("pointermove", (event) => {
  const row = event.target instanceof Element ? event.target.closest(".command-search-result") : null;
  if (!row || !results.contains(row)) {
    return;
  }

  const rows = getRenderedSearchRows();
  const nextIndex = rows.indexOf(row);
  if (nextIndex === -1 || nextIndex === activeSearchIndex) {
    return;
  }

  setSearchNavigationMode("pointer");
  activeSearchIndex = nextIndex;
  updateActiveSearchResult({ shouldScroll: false });
});

results?.addEventListener("click", (event) => {
  const row = event.target instanceof Element ? event.target.closest(".command-search-result") : null;
  if (!row) {
    return;
  }

  const targetDeviceId = String(row.dataset.deviceId || "");
  if (!targetDeviceId) {
    return;
  }

  const device = appState.currentDevices.find((entry) => String(entry.id) === targetDeviceId);
  if (!device) {
    return;
  }

  queueDeviceJump(device);
});

// ctrl + k
document.addEventListener("keydown", (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") {
    return;
  }

  event.preventDefault();
  openDeviceSearch();
});
}
