"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useApproveEvaluationEditRequestMutation,
  useGetAdminEvaluationEditRequestsQuery,
  useRejectEvaluationEditRequestMutation,
  type MatchEvaluationEditRequest,
} from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

const displayStatus = (request: MatchEvaluationEditRequest) => {
  if (request.status === "approved" && request.consumed_at) return "used";
  return request.status;
};

const statusVariant = (status: string) => {
  if (status === "pending") return "warning" as const;
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "destructive" as const;
  return "secondary" as const;
};

export default function AdminRequestsPage() {
  const { data, isLoading, isError, refetch } =
    useGetAdminEvaluationEditRequestsQuery({ limit: 100 });
  const [approveRequest, { isLoading: approving }] =
    useApproveEvaluationEditRequestMutation();
  const [rejectRequest, { isLoading: rejecting }] =
    useRejectEvaluationEditRequestMutation();

  const requests = data?.data ?? [];
  const busy = approving || rejecting;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Requests"
        description="Coach requests that need admin approval."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Requests" },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center justify-between gap-3 p-5">
            <p className="text-sm text-muted-foreground">Failed to load requests.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && !requests.length && (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldCheck className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No requests right now.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Evaluation edit requests from coaches will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {requests.map((request) => {
          const status = displayStatus(request);
          const pending = request.status === "pending";

          return (
            <Card key={request.id} className="border-border/50 bg-card">
              <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">
                      {request.opponent_name ?? "Match evaluation"}
                    </h3>
                    <Badge variant={statusVariant(status)} className="capitalize">
                      {status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>{request.coach_name ?? "Coach"}</span>
                    {request.match_date && (
                      <span>
                        {formatDate(request.match_date)}
                        {request.match_time ? ` at ${formatTime12(request.match_time)}` : ""}
                      </span>
                    )}
                    {request.expires_at && status === "approved" && (
                      <span>Open until {new Date(request.expires_at).toLocaleString()}</span>
                    )}
                  </div>
                  {request.reason && (
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {request.match_id && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/matches?matchId=${request.match_id}`}>
                        View Match
                      </Link>
                    </Button>
                  )}
                  {pending ? (
                    <>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={busy}
                        onClick={() => approveRequest({ id: request.id })}
                      >
                        {approving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={busy}
                        onClick={() => rejectRequest({ id: request.id })}
                      >
                        {rejecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Reject
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline" className="gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(request.updated_at).toLocaleString()}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
