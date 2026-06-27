"use client";

import { CalendarDays, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ParentChildTabs } from "@/components/parent/ParentChildTabs";
import { ParentDataError } from "@/components/parent/ParentDataError";
import { useDashboardLanguage } from "@/lib/hooks/useDashboardLanguage";
import { useParentSelectedChild } from "@/lib/hooks/useParentSelectedChild";
import { useGetParentChildCalendarEventsQuery } from "@/lib/store/api/calendarApi";
import { formatDate, formatTime12 } from "@/lib/utils";

const copy = {
  en: {
    title: "Child Calendar",
    description: "Training, matches, and academy events for your child.",
    home: "Home",
    calendar: "Calendar",
    noChild: "No linked child found for this parent account.",
    selectChild: "Select a child",
    loading: "Loading calendar...",
    loadError: "Calendar could not be loaded",
    loadErrorBody: "Check your connection, then try loading the calendar again.",
    retry: "Try again",
    noEvents: "No calendar events yet.",
    training: "Training",
    match: "Match",
    fitness_test: "Fitness test",
    meeting: "Meeting",
    rest_day: "Rest day",
    tournament: "Tournament",
    medical_check: "Medical check",
    assessment_day: "Assessment day",
    scheduled: "Scheduled",
    completed: "Completed",
    finished: "Finished",
    cancelled: "Cancelled",
    postponed: "Postponed",
    otherEvent: "Other event",
    unknownStatus: "Unknown status",
  },
  ar: {
    title: "تقويم اللاعب",
    description: "التدريبات والمباريات وأحداث الأكاديمية الخاصة بطفلك.",
    home: "الرئيسية",
    calendar: "التقويم",
    noChild: "لا يوجد لاعب مرتبط بحساب ولي الأمر.",
    selectChild: "اختر اللاعب",
    loading: "جاري تحميل التقويم...",
    loadError: "تعذر تحميل التقويم",
    loadErrorBody: "تحقق من الاتصال ثم حاول تحميل التقويم مرة أخرى.",
    retry: "إعادة المحاولة",
    noEvents: "لا توجد أحداث في التقويم حتى الآن.",
    training: "تدريب",
    match: "مباراة",
    fitness_test: "اختبار لياقة",
    meeting: "اجتماع",
    rest_day: "راحة",
    tournament: "بطولة",
    medical_check: "كشف طبي",
    assessment_day: "يوم تقييم",
    scheduled: "مجدول",
    completed: "مكتمل",
    finished: "منتهي",
    cancelled: "ملغي",
    postponed: "مؤجل",
    otherEvent: "حدث آخر",
    unknownStatus: "حالة غير محددة",
  },
} as const;

type CalendarCopy = Record<keyof typeof copy.en, string>;

function labelFor(key: string, t: CalendarCopy, fallback: string) {
  return t[key as keyof typeof copy.en] || fallback;
}

export default function ParentCalendarPage() {
  const language = useDashboardLanguage();
  const t = copy[language];
  const locale = language === "ar" ? "ar-EG" : "en-US";
  const {
    children,
    selectedChildId: childId,
    setSelectedChildId: setChildId,
    isLoading: childrenLoading,
    isError: childrenError,
    refetch: refetchChildren,
  } = useParentSelectedChild();
  const {
    data,
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useGetParentChildCalendarEventsQuery(childId, { skip: !childId });
  const events = data?.data ?? [];
  const isLoading = childrenLoading || eventsLoading;
  const isError = childrenError || eventsError;

  return (
    <div className="space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        description={t.description}
        breadcrumbs={[
          { label: t.home, href: "/parent/home" },
          { label: t.calendar },
        ]}
      />

      <ParentChildTabs
        items={children}
        selectedChildId={childId}
        onSelect={setChildId}
        ariaLabel={t.selectChild}
      />

      {isError ? (
        <ParentDataError
          title={t.loadError}
          description={t.loadErrorBody}
          retryLabel={t.retry}
          onRetry={() => {
            refetchChildren();
            if (childId) refetchEvents();
          }}
        />
      ) : !childId && !childrenLoading ? (
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
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id} className="border-border/50 bg-card">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{event.title}</h3>
                    <Badge variant="outline">{labelFor(event.event_type, t, t.otherEvent)}</Badge>
                    <Badge variant="secondary">{labelFor(event.status, t, t.unknownStatus)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(event.start_datetime, locale)} · {formatTime12(event.start_datetime, locale)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {!events.length && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {t.noEvents}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
