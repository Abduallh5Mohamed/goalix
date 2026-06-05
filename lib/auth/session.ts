const AUTH_SESSION_KEY = "goalix:auth-session";

export function hasAuthSessionMarker() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_SESSION_KEY) === "1";
}

export function rememberAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_SESSION_KEY, "1");
}

export function forgetAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}
