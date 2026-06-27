"use client";

import { Calendar, CalendarDays, Clock, Loader2, MapPin, User, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ParentChildTabs } from "@/components/parent/ParentChildTabs";
import { ParentDataError } from "@/components/parent/ParentDataError";
import { useDashboardLanguage } from "@/lib/hooks/useDashboardLanguage";
import { useParentSelectedChild } from "@/lib/hooks/useParentSelectedChild";
import {
  type CalendarEvent,
  useGetParentChildTrainingsQuery,
} from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

const copy = {
  en: {
    title: "Schedule",
    description: (name?: string | null) => `Upcoming training sessions for ${name || "your child"}`,
    home: "Home",
    player: "Player",
    group: "Group",
    totalSessions: "Total Sessions",
    noChild: "No linked child found for this parent account.",
    selectChild: "Select a child",
    loading: "Loading schedule...",
    loadError: "Schedule could not be loaded",
    loadErrorBody: "Check your connection, then try loading the schedule again.",
    retry: "Try again",
    noSessions: "No upcoming sessions",
    session: "session",
    sessions: "sessions",
    location: "Location",
    coach: "Coach",
    notSelected: "Not selected yet",
  },
  ar: {
    title: "الجدول",
    description: (name?: string | null) => `الحصص التدريبية القادمة لـ ${name || "اللاعب"}`,
    home: "الرئيسية",
    player: "اللاعب",
    group: "المجموعة",
    totalSessions: "إجمالي الحصص",
    noChild: "لا يوجد لاعب مرتبط بحساب ولي الأمر.",
    selectChild: "اختر اللاعب",
    loading: "جاري تحميل الجدول...",
    loadError: "تعذر تحميل الجدول",
    loadErrorBody: "تحقق من الاتصال ثم حاول تحميل الجدول مرة أخرى.",
    retry: "إعادة المحاولة",
    noSessions: "لا توجد حصص قادمة",
    session: "حصة",
    sessions: "حصص",
    location: "المكان",
    coach: "المدرب",
    notSelected: "لم يتم الاختيار بعد",
  },
} as const;

const eventTypeLabels = {
  en: {
    training: "Training",
    match: "Match",
    fitness_test: "Fitness test",
    meeting: "Meeting",
    rest_day: "Rest day",
    tournament: "Tournament",
    medical_check: "Medical check",
    assessment_day: "Assessment day",
  },
  ar: {
    training: "تدريب",
    match: "مباراة",
    fitness_test: "اختبار لياقة",
    meeting: "اجتماع",
    rest_day: "راحة",
    tournament: "بطولة",
    medical_check: "كشف طبي",
    assessment_day: "يوم تقييم",
  },
} as const;

const statusLabels = {
  en: {
    scheduled: "Scheduled",
    completed: "Completed",
    finished: "Finished",
    cancelled: "Cancelled",
    postponed: "Postponed",
  },
  ar: {
    scheduled: "مجدول",
    completed: "مكتمل",
    finished: "منتهي",
    cancelled: "ملغي",
    postponed: "مؤجل",
  },
} as const;

type DashboardLanguage = keyof typeof copy;

function eventTypeLabel(event: CalendarEvent, language: DashboardLanguage) {
  const labels = eventTypeLabels[language];
  return labels[event.event_type as keyof typeof labels] || (language === "ar" ? "حدث آخر" : "Other event");
}

function statusLabel(status: string, language: DashboardLanguage) {
  const labels = statusLabels[language];
  return labels[status as keyof typeof labels] || (language === "ar" ? "حالة غير محددة" : "Unknown status");
}

function groupByDate(events: CalendarEvent[]) {
  return events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const key = String(event.start_datetime || "").slice(0, 10) || "unknown";
    acc[key] = acc[key] || [];
    acc[key].push(event);
    return acc;
  }, {});
}

export default function ParentSchedulePage() {
  const language = useDashboardLanguage();
  const t = copy[language];
  const locale = language === "ar" ? "ar-EG" : "en-US";
  const {
    children,
    selectedChild,
    selectedChildId,
    setSelectedChildId,
    isLoading: childrenLoading,
    isError: childrenError,
    refetch: refetchChildren,
  } = useParentSelectedChild();
  const {
    data,
    isLoading: scheduleLoading,
    isError: scheduleError,
    refetch: refetchSchedule,
  } = useGetParentChildTrainingsQuery(selectedChildId, { skip: !selectedChildId });
  const sessions = [...(data?.data ?? [])].sort((a, b) =>
    String(a.start_datetime || "").localeCompare(String(b.start_datetime || "")),
  );
  const grouped = groupByDate(sessions);
  const isLoading = childrenLoading || scheduleLoading;
  const isError = childrenError || scheduleError;

  return (
    <div className="space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        description={t.description(selectedChild?.full_name)}
        breadcrumbs={[
          { label: t.home, href: "/parent/home" },
          { label: t.title },
        ]}
      />

      <ParentChildTabs
        items={children}
        selectedChildId={selectedChildId}
        onSelect={setSelectedChildId}
        ariaLabel={t.selectChild}
      />

      <Card className="border-border/50 bg-card">
        <CardContent className="flex flex-wrap items-center gap-6 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{selectedChild?.full_name || "-"}</p>
              <p className="text-xs text-muted-foreground">{t.player}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-border/30" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10">
              <Users className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">{selectedChild?.group_name || t.notSelected}</p>
              <p className="text-xs text-muted-foreground">{selectedChild?.branch_name || t.group}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-border/30" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <CalendarDays className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">{sessions.length}</p>
              <p className="text-xs text-muted-foreground">{t.totalSessions}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <ParentDataError
          title={t.loadError}
          description={t.loadErrorBody}
          retryLabel={t.retry}
          onRetry={() => {
            refetchChildren();
            if (selectedChildId) refetchSchedule();
          }}
        />
      ) : !selectedChildId && !childrenLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t.noChild}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.loading}
          </CardContent>
        </Card>
      ) : Object.entries(grouped).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateSessions]) => (
            <section key={date}>
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{formatDate(date, locale)}</h3>
                <Badge variant="outline" className="text-[10px]">
                  {dateSessions.length} {dateSessions.length === 1 ? t.session : t.sessions}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {dateSessions.map((session) => (
                  <Card
                    key={session.id}
                    className="border-border/30 bg-card transition-all hover:border-border/60"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold">{session.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {session.groups?.map((group) => group.name).join(", ") ||
                              selectedChild?.group_name ||
                              "-"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-xs">
                            {eventTypeLabel(session, language)}
                          </Badge>
                          <Badge variant={session.status === "cancelled" ? "destructive" : "secondary"}>
                            {statusLabel(session.status, language)}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime12(session.start_datetime, locale)} - {formatTime12(session.end_datetime, locale)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {session.location || t.location}
                        </span>
                        {selectedChild?.coaches?.[0]?.full_name && (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {selectedChild.coaches[0].full_name}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="border-border/30 bg-card">
          <CardContent className="flex flex-col items-center gap-3 p-12">
            <Calendar className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">{t.noSessions}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
