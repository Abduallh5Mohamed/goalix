"use client";

import { Loader2, MessageSquare, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboardLanguage } from "@/lib/hooks/useDashboardLanguage";
import { useGetPlayerFamilyNotesQuery } from "@/lib/store/api/calendarApi";

const copy = {
  en: {
    title: "Family Notes",
    description: "Family observations and coaching responses shared with you by your coach.",
    home: "Home",
    loading: "Loading family notes...",
    empty: "No family notes have been shared with you yet.",
    parentObservation: "Family observation",
    coachReply: "Coach response",
    reviewed: "Reviewed",
    resolved: "Resolved",
    new: "New",
    failed: "Family notes could not be loaded.",
  },
  ar: {
    title: "ملاحظات الأسرة",
    description: "ملاحظات الأسرة وردود المدرب التي سمح المدرب بمشاركتها معك.",
    home: "الرئيسية",
    loading: "جاري تحميل ملاحظات الأسرة...",
    empty: "لم تتم مشاركة ملاحظات أسرية معك حتى الآن.",
    parentObservation: "ملاحظة الأسرة",
    coachReply: "رد المدرب",
    reviewed: "تمت المراجعة",
    resolved: "تم الحل",
    new: "جديدة",
    failed: "تعذر تحميل ملاحظات الأسرة.",
  },
} as const;

function formatDate(value: string, language: "en" | "ar") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function PlayerFamilyNotesPage() {
  const language = useDashboardLanguage();
  const t = copy[language];
  const { data, isLoading, isError } = useGetPlayerFamilyNotesQuery({
    limit: 100,
  });
  const notes = data?.data ?? [];

  return (
    <div className="space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        description={t.description}
        breadcrumbs={[
          { label: t.home, href: "/player/home" },
          { label: t.title },
        ]}
      />

      {isLoading ? (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.loading}
          </CardContent>
        </Card>
      ) : isError ? (
        <Card className="border-rose-400/30 bg-rose-400/10">
          <CardContent className="flex items-center gap-3 p-5 font-bold text-rose-500">
            <ShieldCheck className="h-5 w-5" />
            {t.failed}
          </CardContent>
        </Card>
      ) : notes.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {notes.map((note) => (
            <Card key={note.id} className="border-border/50 bg-card">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <MessageSquare className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-black text-primary">
                        {t.parentObservation}
                      </p>
                      <h2 className="mt-1 text-lg font-black text-foreground">
                        {note.title || t.parentObservation}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {formatDate(note.created_at, language)}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                    {t[note.status]}
                  </span>
                </div>

                <p className="mt-4 whitespace-pre-wrap rounded-2xl border border-border/40 bg-muted/20 p-4 text-sm font-semibold leading-7 text-foreground">
                  {note.body}
                </p>

                {note.coach_response && (
                  <div className="mt-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-4">
                    <strong className="text-sm font-black text-cyan-600">
                      {t.coachReply}
                      {note.coach_name ? ` - ${note.coach_name}` : ""}
                    </strong>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7 text-foreground">
                      {note.coach_response}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50 bg-card">
          <CardContent className="grid min-h-56 place-items-center p-8 text-center">
            <div>
              <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-bold text-muted-foreground">{t.empty}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
