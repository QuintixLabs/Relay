/*
  public/js/hub/core/api.js

  Sends Hub API requests with the current login session.
*/

import { SESSION_EXPIRED_MESSAGE } from "../../shared/formatters.js";

export function createHubApi() {
  return async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(SESSION_EXPIRED_MESSAGE);
      }

      throw new Error(payload.error || `Request failed with ${response.status}`);
    }

    return payload;
  };
}
