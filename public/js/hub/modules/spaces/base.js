/*
  public/js/hub/modules/spaces/base.js

  Holds simple space helpers used by the Hub.
*/

export const SPACE_ALL = "all";
export const NO_SPACE_LABEL = "No space";

export function getVisibleDevices(devices, selectedSpace) {
  if (selectedSpace === SPACE_ALL) {
    return devices;
  }

  return devices.filter((device) => device.spaceId === selectedSpace);
}

export function describeSpaceState(_spaces, _devices, _selectedSpace) {
  return "Keep devices organized.";
}

export function renderSpaceList({ container, template, spaces, devices, selectedSpace, onSelect, onEdit, onDelete }) {
  container.innerHTML = "";

  const entries = [
    {
      id: SPACE_ALL,
      name: "All devices",
      count: devices.length,
      locked: true
    },
    ...spaces.map((space) => ({
      ...space,
      count: devices.filter((device) => device.spaceId === space.id).length,
      locked: false
    }))
  ];

  for (const entry of entries) {
    const fragment = template.content.cloneNode(true);
    const item = fragment.querySelector(".space-item");
    const select = fragment.querySelector(".space-select");
    const name = fragment.querySelector(".space-name");
    const actions = fragment.querySelector(".space-item-actions");
    const edit = fragment.querySelector(".space-edit");
    const remove = fragment.querySelector(".space-delete");

    item.dataset.spaceId = entry.id;
    item.dataset.selected = String(entry.id === selectedSpace);
    name.textContent = entry.name;
    select.addEventListener("click", () => onSelect(entry.id));

    if (entry.locked) {
      actions.remove();
    } else {
      edit.addEventListener("click", (event) => {
        event.stopPropagation();
        onEdit(entry);
      });
      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        onDelete(entry);
      });
    }

    container.appendChild(fragment);
  }
}

export function renderAssignSpaceOptions({ container, spaces, selectedSpaceId }) {
  container.innerHTML = "";
  const entries = [
    {
      id: "",
      name: NO_SPACE_LABEL
    },
    ...spaces.map((space) => ({
      id: space.id,
      name: space.name
    }))
  ];

  for (const entry of entries) {
    const label = document.createElement("label");
    label.className = "assign-space-option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "spaceId";
    input.value = entry.id;
    input.checked = entry.id === (selectedSpaceId || "");

    const name = document.createElement("span");
    name.className = "assign-space-name";
    name.textContent = entry.name;

    label.append(input, name);
    container.appendChild(label);
  }
}
