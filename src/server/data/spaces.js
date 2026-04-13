/*
  src/server/data/spaces.js

  Holds small space helpers used by the server.
*/

import { MAX_SPACES } from "../core/config.js";
import { slugifyDeviceId } from "./devices.js";

export function sanitizeSpace(space) {
  return {
    id: space.id,
    name: space.name,
    icon: space.icon || "lucide:panels-top-left"
  };
}

export function validateSpaceInput(input, existingSpaces) {
  const name = String(input.name || "").trim();
  const id = slugifyDeviceId(input.id || name);

  if (existingSpaces.length >= MAX_SPACES) {
    throw new Error(`You can create up to ${MAX_SPACES} spaces`);
  }

  if (!name) {
    throw new Error("Space name is required");
  }

  if (name.length > 24) {
    throw new Error("Space names can be up to 24 characters");
  }

  if (!id) {
    throw new Error("Space ID is invalid");
  }

  if (existingSpaces.some((space) => space.id === id)) {
    throw new Error("A space with that name already exists");
  }

  return {
    id,
    name,
    icon: "lucide:panels-top-left"
  };
}
