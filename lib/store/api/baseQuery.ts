import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { loginSuccess, logout } from "../slices/authSlice";
import type { UserRole } from "@/lib/types";
import { hasAuthSessionMarker } from "@/lib/auth/session";
import { refreshAuthSession } from "@/lib/auth/refreshSession";
import { getApiBaseUrl } from "@/lib/api/baseUrl";

const API_BASE = getApiBaseUrl();

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
    if (!hasAuthSessionMarker()) {
      api.dispatch(logout());
      return result;
    }

    const refreshResult = await refreshAuthSession();

    if (!refreshResult.ok) {
      if (refreshResult.unauthorized) {
        api.dispatch(logout());
      }
      return result;
    }

    const user = mapApiUser(refreshResult.user);
    api.dispatch(loginSuccess({ user, role: user.role }));
    result = await rawBaseQuery(args, api, extraOptions);
  }

  return result;
};
