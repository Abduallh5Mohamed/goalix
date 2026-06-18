"use client";

import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { store } from "./store";
import { loginSuccess, logout } from "./slices/authSlice";
import type { UserRole } from "@/lib/types";
import { forgetAuthSession, hasAuthSessionMarker, rememberAuthSession } from "@/lib/auth/session";
import { getApiBaseUrl } from "@/lib/api/baseUrl";

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
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!hasAuthSessionMarker()) {
      store.dispatch(logout());
      return;
    }

    fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const apiUser = json?.data?.user as Record<string, unknown> | undefined;
        if (!apiUser) {
          forgetAuthSession();
          store.dispatch(logout());
          return;
        }

        const user = mapApiUser(apiUser);
        rememberAuthSession();
        store.dispatch(loginSuccess({ user, role: user.role }));
      })
      .catch(() => {
        forgetAuthSession();
        store.dispatch(logout());
      });
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
