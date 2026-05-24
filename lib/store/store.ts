"use client";

import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { academyApi } from "./api/academyApi";
import { dashboardApi } from "./api/dashboardApi";
import { adminApi } from "./api/adminApi";
import { coachApi } from "./api/coachApi";
import { calendarApi } from "./api/calendarApi";
import { registrationsApi } from "./api/registrationsApi";
import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [academyApi.reducerPath]: academyApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [coachApi.reducerPath]: coachApi.reducer,
    [calendarApi.reducerPath]: calendarApi.reducer,
    [registrationsApi.reducerPath]: registrationsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(academyApi.middleware)
      .concat(dashboardApi.middleware)
      .concat(adminApi.middleware)
      .concat(coachApi.middleware)
      .concat(calendarApi.middleware)
      .concat(registrationsApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
