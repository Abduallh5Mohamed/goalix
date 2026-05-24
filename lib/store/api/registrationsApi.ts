import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

export interface RegistrationRecord {
    id: string;
    email?: string;
    phone?: string;
    fullName: string;
    role: "player" | "parent";
    status: "pending" | "approved" | "rejected";
    rejectionReason?: string | null;
    linkedPlayerId?: string | null;
    linkedPlayerName?: string | null;
    createdAt: string;
    reviewedAt?: string | null;
}

export const registrationsApi = createApi({
    reducerPath: "registrationsApi",
    baseQuery: baseQueryWithReauth,
    endpoints: (builder) => ({
        getPendingRegistrations: builder.query<{ data: RegistrationRecord[] }, string | undefined>({
            query: (status) =>
                status ? `/admin/registrations?status=${status}` : "/admin/registrations",
        }),
        approveRegistration: builder.mutation<void, string>({
            query: (id) => ({
                url: `/admin/registrations/${id}/approve`,
                method: "POST",
            }),
        }),
        rejectRegistration: builder.mutation<void, { id: string; reason: string }>({
            query: ({ id, reason }) => ({
                url: `/admin/registrations/${id}/reject`,
                method: "POST",
                body: { reason },
            }),
        }),
    }),
});

export const {
    useGetPendingRegistrationsQuery,
    useApproveRegistrationMutation,
    useRejectRegistrationMutation,
} = registrationsApi;
