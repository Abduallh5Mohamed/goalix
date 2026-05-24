"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  useGetCoachSessionQuery,
  useGetCoachSessionsQuery,
} from "@/lib/store/api/coachApi";
import { getInitials, formatDate, formatTime12 } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Users,
  ClipboardCheck,
  FileText,
  Loader2,
} from "lucide-react";
import Link from "next/link";

function SessionContent() {
  const searchParams = useSearchParams();
  const requestedSessionId = searchParams.get("id");
  const { data: sessionsData } = useGetCoachSessionsQuery({ limit: 1 });
  const sessionId = requestedSessionId || sessionsData?.data[0]?.id || "";
  const { data, isLoading, isError } = useGetCoachSessionQuery(sessionId, {
    skip: !sessionId,
  });
  const session = data?.session;

  if (isLoading || (!sessionId && !sessionsData)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading session...
      </div>
    );
  }

  if (!session || isError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  const attendanceRecords = data?.records ?? [];

  const typeColors: Record<string, string> = {
    training: "bg-primary/20 text-primary",
    match: "bg-red-500/20 text-red-400",
    assessment: "bg-amber-500/20 text-amber-400",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Session Detail"
        description={session.groupName}
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Schedule", href: "/coach/schedule" },
          { label: "Session Detail" },
        ]}
        actions={
          <Link href="/coach/attendance/mark">
            <Button size="sm">
              <ClipboardCheck className="mr-1 h-4 w-4" />
              Mark Attendance
            </Button>
          </Link>
        }
      />

      {/* Session Info */}
      <Card className="border-border/50 bg-card">
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(session.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="font-medium">
                  {formatTime12(session.startTime)} -{" "}
                  {formatTime12(session.endTime)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Attendance</p>
                <p className="font-medium">
                  {session.attendanceCount}/{session.totalPlayers}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={typeColors[session.type] || ""}
                variant="secondary"
              >
                {session.type}
              </Badge>
            </div>
          </div>
          {session.notes && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/20 p-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{session.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Attendance Records ({attendanceRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {attendanceRecords.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/20 text-xs text-primary">
                    {getInitials(record.playerName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{record.playerName}</p>
                  {record.notes && (
                    <p className="text-xs text-muted-foreground">
                      {record.notes}
                    </p>
                  )}
                </div>
              </div>
              <StatusBadge status={record.status} type="attendance" />
            </div>
          ))}
          {attendanceRecords.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No attendance records yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CoachSessionDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <SessionContent />
    </Suspense>
  );
}
