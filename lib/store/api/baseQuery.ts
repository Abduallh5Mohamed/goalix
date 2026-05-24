import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { loginSuccess, logout } from "../slices/authSlice";
import type { UserRole } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

let refreshPromise: Promise<boolean> | null = null;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE}/api/v1`,
  credentials: "include",
});

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

export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const refreshResult = await rawBaseQuery(
          { url: "/auth/refresh", method: "POST" },
          api,
          extraOptions,
        );

        const data = refreshResult.data as { data?: { user?: Record<string, unknown> } } | undefined;
        const apiUser = data?.data?.user;

        if (apiUser) {
          const user = mapApiUser(apiUser);
          api.dispatch(loginSuccess({ user, role: user.role }));
          return true;
        }

        api.dispatch(logout());
        return false;
      })();
    }

    const refreshed = await refreshPromise;
    refreshPromise = null;

    if (refreshed) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};
