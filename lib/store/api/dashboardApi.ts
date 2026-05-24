import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardKPIs {
    totalPlayers: number;
    totalCoaches: number;
    activeSubscriptions: number;
    overduePayments: number;
    monthlyRevenue: number;
    avgAttendanceRate: number;
}

export interface ChartPoint {
    label: string;
    value: number;
}

export interface TopPlayer {
    id: string;
    fullName: string;
    totalScore: number | string;
    rank: number;
    period: string;
}

export interface RecentAlert {
    id: string;
    title: string;
    body: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}

export interface DashboardData {
    kpis: DashboardKPIs;
    attendanceTrend: ChartPoint[];
    revenueTrend: ChartPoint[];
    topPlayers: TopPlayer[];
    recentAlerts: RecentAlert[];
}

export interface PlayerListItem {
    id: string;
    full_name: string;
    level: string | null;
    position: string | null;
    photo_url: string | null;
    created_at: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const dashboardApi = createApi({
    reducerPath: "dashboardApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["Dashboard", "Players"],
    endpoints: (builder) => ({
        getDashboard: builder.query<DashboardData, void>({
            query: () => "/admin/dashboard",
            transformResponse: (res: { data: DashboardData }) => res.data,
            providesTags: ["Dashboard"],
        }),
        getRecentPlayers: builder.query<PlayerListItem[], void>({
            query: () => "/players?limit=6",
            transformResponse: (res: { data: PlayerListItem[] }) => res.data,
            providesTags: ["Players"],
        }),
    }),
});

export const { useGetDashboardQuery, useGetRecentPlayersQuery } = dashboardApi;
