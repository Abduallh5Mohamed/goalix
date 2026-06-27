import { academyApi } from "./api/academyApi";
import { adminApi } from "./api/adminApi";
import { calendarApi } from "./api/calendarApi";
import { coachApi } from "./api/coachApi";
import { dashboardApi } from "./api/dashboardApi";
import { registrationsApi } from "./api/registrationsApi";
import type { AppDispatch } from "./store";

export function resetApiState(dispatch: AppDispatch) {
  dispatch(academyApi.util.resetApiState());
  dispatch(adminApi.util.resetApiState());
  dispatch(calendarApi.util.resetApiState());
  dispatch(coachApi.util.resetApiState());
  dispatch(dashboardApi.util.resetApiState());
  dispatch(registrationsApi.util.resetApiState());
}
