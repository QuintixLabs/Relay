/*
  public/js/shared/storage.js

  Reads and writes small values in browser storage.
*/

export function getStoredValue(key, fallback = "") {
  return localStorage.getItem(key) || fallback;
}

export function setStoredValue(key, value) {
  localStorage.setItem(key, value);
}

export function clearAuthToken() {
  localStorage.removeItem("relay.auth.token");
  localStorage.removeItem("relay.auth.expires");
  localStorage.removeItem("relay.auth.mode");
  localStorage.removeItem("relay.auth.session");
}
