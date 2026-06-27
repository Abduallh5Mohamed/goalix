"use client";

import { useMemo, useState } from "react";
import { MessageSquare, RefreshCw, Send } from "lucide-react";
import {
  type ParentPlayerNote,
  useGetCoachParentNotesQuery,
  useRespondCoachParentNoteMutation,
} from "@/lib/store/api/calendarApi";
import { useDashboardLanguage } from "@/lib/hooks/useDashboardLanguage";

const copy = {
  en: {
    eyebrow: "Family feedback center",
    title: "Parent Notes",
    subtitle: "Review family observations, answer follow-ups, and control who can see each coaching response.",
    refresh: "Refresh",
    total: "Total",
    new: "New",
    reviewed: "Reviewed",
    resolved: "Resolved",
    inbox: "Notes Inbox",
    inboxHint: "Parent notes from players in your coaching scope.",
    allStatuses: "All statuses",
    parentNote: "Parent note",
    about: "about",
    coachReply: "Coach reply",
    replyPlaceholder: "Write the coaching response...",
    coachOnly: "Coach only",
    parentAndCoach: "Parent and coach",
    playerAndParent: "Player and parent",
    family: "Whole family",
    reply: "Reply",
    resolve: "Resolve",
    empty: "No parent notes yet.",
    loading: "Loading parent notes...",
    saved: "The note was updated successfully.",
    failed: "The note could not be updated. Please try again.",
    observation: "Parent observation",
  },
  ar: {
    eyebrow: "مركز تواصل الأسرة",
    title: "ملاحظات أولياء الأمور",
    subtitle: "راجع ملاحظات الأسرة، أجب عن المتابعات، وحدد من يمكنه رؤية كل رد تدريبي.",
    refresh: "تحديث",
    total: "الإجمالي",
    new: "جديدة",
    reviewed: "تمت المراجعة",
    resolved: "تم الحل",
    inbox: "صندوق الملاحظات",
    inboxHint: "ملاحظات أولياء أمور اللاعبين الموجودين ضمن نطاقك التدريبي.",
    allStatuses: "كل الحالات",
    parentNote: "ملاحظة ولي أمر",
    about: "بخصوص",
    coachReply: "رد المدرب",
    replyPlaceholder: "اكتب رد المدرب...",
    coachOnly: "المدرب فقط",
    parentAndCoach: "ولي الأمر والمدرب",
    playerAndParent: "اللاعب وولي الأمر",
    family: "الأسرة بالكامل",
    reply: "إرسال الرد",
    resolve: "حل الملاحظة",
    empty: "لا توجد ملاحظات من أولياء الأمور بعد.",
    loading: "جاري تحميل ملاحظات أولياء الأمور...",
    saved: "تم تحديث الملاحظة بنجاح.",
    failed: "تعذر تحديث الملاحظة. حاول مرة أخرى.",
    observation: "ملاحظة ولي الأمر",
  },
} as const;

export default function CoachParentNotesPage() {
  const language = useDashboardLanguage();
  const t = copy[language];
  const [status, setStatus] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [visibilityDrafts, setVisibilityDrafts] = useState<Record<string, ParentPlayerNote["visibility"]>>({});
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { data, isLoading, refetch } = useGetCoachParentNotesQuery({
    status: status || undefined,
    limit: 100,
  });
  const [respond, respondState] = useRespondCoachParentNoteMutation();
  const notes = useMemo(() => data?.data ?? [], [data?.data]);

  const counts = useMemo(
    () => ({
      total: notes.length,
      new: notes.filter((note) => note.status === "new").length,
      reviewed: notes.filter((note) => note.status === "reviewed").length,
      resolved: notes.filter((note) => note.status === "resolved").length,
    }),
    [notes],
  );

  async function sendReply(noteId: string, nextStatus = "reviewed") {
    const body = drafts[noteId]?.trim();
    setNotice(null);
    try {
      await respond({
        noteId,
        body: {
          coachResponse: body || undefined,
          status: nextStatus as "reviewed" | "resolved",
          visibility: visibilityDrafts[noteId],
        },
      }).unwrap();
      setDrafts((current) => ({ ...current, [noteId]: "" }));
      setNotice({ type: "success", text: t.saved });
    } catch {
      setNotice({ type: "error", text: t.failed });
    }
  }

  return (
    <div className="space-y-5" dir={language === "ar" ? "rtl" : "ltr"}>
      <section className="grid gap-5 xl:grid-cols-[1fr_auto]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-lime-300">
            {t.eyebrow}
          </p>
          <h1 className="mt-2 font-display text-5xl font-black leading-none text-white md:text-6xl">
            {t.title}
          </h1>
          <p className="mt-2 max-w-3xl text-base font-semibold text-slate-300">
            {t.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#2a4460] px-5 font-black text-slate-100"
        >
          <RefreshCw className="h-4 w-4" />
          {t.refresh}
        </button>
      </section>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border px-4 py-3 text-sm font-black ${
            notice.type === "success"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-rose-400/30 bg-rose-400/10 text-rose-300"
          }`}
        >
          {notice.text}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          [t.total, counts.total],
          [t.new, counts.new],
          [t.reviewed, counts.reviewed],
          [t.resolved, counts.resolved],
        ].map(([label, value]) => (
          <div
            key={label}
            className="goalix-dashboard-panel rounded-[18px] border border-[#2a4460]/80 bg-[#07172a]/78 p-5"
          >
            <p className="text-sm font-bold text-slate-400">{label}</p>
            <strong className="mt-2 block font-display text-4xl text-white">
              {value}
            </strong>
          </div>
        ))}
      </section>

      <section className="goalix-dashboard-panel rounded-[20px] border border-[#2a4460]/80 bg-[#07172a]/78 p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300/15 text-lime-300">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-black text-white">
                {t.inbox}
              </h2>
              <p className="text-sm font-semibold text-slate-400">
                {t.inboxHint}
              </p>
            </div>
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 rounded-2xl border border-[#2a4460] bg-[#06111f]/86 px-4 text-sm font-black text-slate-100 outline-none"
          >
            <option value="">{t.allStatuses}</option>
            <option value="new">{t.new}</option>
            <option value="reviewed">{t.reviewed}</option>
            <option value="resolved">{t.resolved}</option>
          </select>
        </div>

        <div className="grid gap-4">
          {notes.map((note) => (
            <article
              key={note.id}
              className="rounded-[18px] border border-[#253f5a] bg-white/[0.035] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-300">
                    {note.category === "parent_observation"
                      ? t.observation
                      : note.category.replace(/_/g, " ")}
                  </p>
                  <h3 className="mt-1 text-xl font-black text-white">
                    {note.title || t.parentNote}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    {note.parent_name} {t.about} {note.player_name}
                  </p>
                </div>
                <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-xs font-black text-lime-300">
                  {t[note.status]}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap rounded-2xl border border-[#253f5a] bg-[#06111f]/60 p-4 text-sm font-semibold leading-7 text-slate-200">
                {note.body}
              </p>
              {note.coach_response && (
                <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-semibold text-cyan-100">
                  <strong className="mb-1 block text-cyan-300">{t.coachReply}</strong>
                  {note.coach_response}
                </div>
              )}
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto_auto]">
                <textarea
                  value={drafts[note.id] ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [note.id]: event.target.value,
                    }))
                  }
                  rows={2}
                  maxLength={3000}
                  aria-label={t.replyPlaceholder}
                  placeholder={t.replyPlaceholder}
                  className="min-h-12 resize-none rounded-2xl border border-[#253f5a] bg-[#06111f]/86 px-4 py-3 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-500"
                />
                <select
                  value={visibilityDrafts[note.id] ?? note.visibility}
                  onChange={(event) =>
                    setVisibilityDrafts((current) => ({
                      ...current,
                      [note.id]: event.target.value as ParentPlayerNote["visibility"],
                    }))
                  }
                  className="h-12 rounded-2xl border border-[#253f5a] bg-[#06111f]/86 px-4 text-sm font-black text-slate-100 outline-none"
                >
                  <option value="coach_only">{t.coachOnly}</option>
                  <option value="parent_and_coach">{t.parentAndCoach}</option>
                  <option value="player_and_parent">{t.playerAndParent}</option>
                  <option value="family">{t.family}</option>
                </select>
                <button
                  type="button"
                  disabled={respondState.isLoading}
                  onClick={() => sendReply(note.id, "reviewed")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#51b848] to-[#2d9ad5] px-5 font-black text-[#06111f] disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {t.reply}
                </button>
                <button
                  type="button"
                  disabled={respondState.isLoading}
                  onClick={() => sendReply(note.id, "resolved")}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-lime-300/35 px-5 font-black text-lime-300 disabled:opacity-60"
                >
                  {t.resolve}
                </button>
              </div>
            </article>
          ))}

          {!isLoading && notes.length === 0 && (
            <div className="rounded-[18px] border border-dashed border-[#2a4460] p-8 text-center font-bold text-slate-400">
              {t.empty}
            </div>
          )}
          {isLoading && (
            <div className="rounded-[18px] border border-dashed border-[#2a4460] p-8 text-center font-bold text-slate-400">
              {t.loading}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
