"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "./store";
import { authInitialized, loginSuccess, logout } from "./slices/authSlice";
import type { UserRole } from "@/lib/types";
import { forgetAuthSession, hasAuthSessionMarker, rememberAuthSession } from "@/lib/auth/session";
import { getApiBaseUrl } from "@/lib/api/baseUrl";
import { resetApiState } from "./resetApiState";

const API_BASE = getApiBaseUrl();

function mapApiUser(apiUser: Record<string, unknown>) {
  return {
    id: apiUser.id as string,
    email: (apiUser.email as string) ?? "",
    username: (apiUser.username as string) ?? undefined,
    fullName:
      (apiUser.full_name as string) ??
      (apiUser.fullName as string) ??
      (apiUser.username as string) ??
      (apiUser.email as string),
    role: apiUser.role as UserRole,
    avatarUrl: (apiUser.avatar_url as string) ?? "",
    phone: (apiUser.phone as string) ?? "",
    linkedPlayerId:
      (apiUser.linkedPlayerId as string | null) ??
      (apiUser.linked_player_id as string | null) ??
      null,
    createdAt: (apiUser.created_at as string) ?? new Date().toISOString(),
  };
}

/** Rehydrates auth state from the httpOnly refresh cookie only. */
function SessionRefresher() {
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    if (!hasAuthSessionMarker()) {
      resetApiState(store.dispatch);
      store.dispatch(logout());
      return;
    }
    const restoreSession = async () => {
      if (!hasAuthSessionMarker()) {
        window.clearTimeout(timeout);
        store.dispatch(authInitialized());
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
        });
        const json = response.ok ? await response.json() : null;
        const apiUser = json?.data?.user as Record<string, unknown> | undefined;
        if (!apiUser) {
          forgetAuthSession();
          resetApiState(store.dispatch);
          store.dispatch(logout());
          return;
        }

        const user = mapApiUser(apiUser);
        rememberAuthSession();
        resetApiState(store.dispatch);
        store.dispatch(loginSuccess({ user, role: user.role }));
      } catch {
        forgetAuthSession();
        resetApiState(store.dispatch);
        store.dispatch(logout());
      } finally {
        window.clearTimeout(timeout);
        store.dispatch(authInitialized());
      }
    };

    void restoreSession();

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return null;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionRefresher />
      {children}
    </Provider>
  );
}
