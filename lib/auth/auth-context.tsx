"use client";

import React, { createContext, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  loginStart,
  loginSuccess,
  loginFailure,
  logout as logoutAction,
} from "@/lib/store/slices/authSlice";
import { mockUsers } from "@/lib/mock-data";
import { ROLE_ROUTES } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

interface AuthContextType {
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USERS_BY_ROLE: Record<UserRole, string> = {
  admin: "u1",
  coach: "u2",
  player: "u4",
  parent: "u5",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const login = useCallback(
    async (_email: string, _password: string, role: UserRole) => {
      dispatch(loginStart());

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const userId = MOCK_USERS_BY_ROLE[role];
      const user = mockUsers.find((u) => u.id === userId);

      if (user) {
        dispatch(loginSuccess({ user, role }));
        router.push(ROLE_ROUTES[role]);
      } else {
        dispatch(loginFailure());
        throw new Error("Invalid credentials");
      }
    },
    [dispatch, router]
  );

  const logout = useCallback(() => {
    dispatch(logoutAction());
    router.push("/login");
  }, [dispatch, router]);

  const switchRole = useCallback(
    (role: UserRole) => {
      const userId = MOCK_USERS_BY_ROLE[role];
      const user = mockUsers.find((u) => u.id === userId);
      if (user) {
        dispatch(loginSuccess({ user, role }));
        router.push(ROLE_ROUTES[role]);
      }
    },
    [dispatch, router]
  );

  return (
    <AuthContext.Provider value={{ login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useCurrentUser() {
  return useAppSelector((state) => state.auth);
}
