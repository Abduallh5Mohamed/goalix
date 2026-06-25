import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User, UserRole } from "@/lib/types";

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart(state) {
      state.isLoading = true;
    },
    loginSuccess(state, action: PayloadAction<{ user: User; role: UserRole }>) {
      state.user = action.payload.user;
      state.role = action.payload.role;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.isInitialized = true;
    },
    loginFailure(state) {
      state.isLoading = false;
      state.isInitialized = true;
    },
    authInitialized(state) {
      state.isInitialized = true;
      state.isLoading = false;
    },
    logout(state) {
      state.user = null;
      state.role = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.isInitialized = true;
    },
    updateUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  authInitialized,
  logout,
  updateUser,
} =
  authSlice.actions;
export default authSlice.reducer;
