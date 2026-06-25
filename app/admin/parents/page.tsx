"use client";

import { useMemo, useState } from "react";
import { Link2, Loader2, Search, ShieldCheck, Trash2, UserRound, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type AdminParentLink,
  useCreateAdminParentLinkMutation,
  useDeleteAdminParentLinkMutation,
  useGetAdminLinkablePlayersQuery,
  useGetAdminParentAccountsQuery,
  useGetAdminParentLinksQuery,
  useUpdateAdminParentLinkMutation,
} from "@/lib/store/api/calendarApi";
import { useDashboardLanguage } from "@/lib/hooks/useDashboardLanguage";

const copy = {
  en: {
    title: "Parents",
    description: "Link every parent account to one or more players and control exactly what each parent can see.",
    dashboard: "Dashboard",
    search: "Search parent, player, phone...",
    parents: "Parents",
    players: "Players",
    links: "Links",
    create: "Create parent-player link",
    parentAccount: "Parent account",
    chooseParent: "Choose parent...",
    player: "Player",
    choosePlayer: "Choose player...",
    relation: "Relation",
    primaryChild: "Primary child",
    progress: "Progress",
    payments: "Payments",
    coachChat: "Coach chat",
    linkParent: "Link parent",
    activeLinks: "Active links",
    loading: "Loading parent links...",
    noContact: "No contact",
    linkedTo: "linked to",
    primary: "Primary",
    remove: "Remove",
    empty: "No parent links yet.",
    createSuccess: "The parent-player link was created.",
    updateSuccess: "The link permissions were updated.",
    removeSuccess: "The parent-player link was removed.",
    actionFailed: "The action could not be completed. Please try again.",
    removeConfirm: "Remove this parent-player link?",
    parentFallback: "Parent account",
  },
  ar: {
    title: "أولياء الأمور",
    description: "اربط كل حساب ولي أمر بلاعب أو أكثر وحدد بدقة ما يمكنه رؤيته واستخدامه.",
    dashboard: "لوحة التحكم",
    search: "ابحث عن ولي أمر أو لاعب أو رقم هاتف...",
    parents: "أولياء الأمور",
    players: "اللاعبون",
    links: "الروابط",
    create: "إنشاء ربط ولي أمر بلاعب",
    parentAccount: "حساب ولي الأمر",
    chooseParent: "اختر ولي الأمر...",
    player: "اللاعب",
    choosePlayer: "اختر اللاعب...",
    relation: "صلة القرابة",
    primaryChild: "اللاعب الأساسي",
    progress: "التقدم",
    payments: "المدفوعات",
    coachChat: "محادثة المدرب",
    linkParent: "ربط ولي الأمر",
    activeLinks: "الروابط النشطة",
    loading: "جاري تحميل روابط أولياء الأمور...",
    noContact: "لا توجد وسيلة تواصل",
    linkedTo: "مرتبط باللاعب",
    primary: "أساسي",
    remove: "فك الربط",
    empty: "لا توجد روابط لأولياء الأمور بعد.",
    createSuccess: "تم إنشاء الربط بين ولي الأمر واللاعب.",
    updateSuccess: "تم تحديث صلاحيات الربط.",
    removeSuccess: "تم فك الربط بين ولي الأمر واللاعب.",
    actionFailed: "تعذر تنفيذ الإجراء. حاول مرة أخرى.",
    removeConfirm: "هل تريد فك الربط بين ولي الأمر واللاعب؟",
    parentFallback: "حساب ولي الأمر",
  },
} as const;

function parentLabel(
  parent: { username?: string | null; email?: string | null; phone?: string | null },
  fallback: string,
) {
  return parent.username || parent.email || parent.phone || fallback;
}

export default function AdminParentsPage() {
  const language = useDashboardLanguage();
  const t = copy[language];
  const [search, setSearch] = useState("");
  const [parentUserId, setParentUserId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [relation, setRelation] = useState("guardian");
  const [isPrimary, setIsPrimary] = useState(false);
  const [canViewProgress, setCanViewProgress] = useState(true);
  const [canViewPayments, setCanViewPayments] = useState(true);
  const [canMessageCoach, setCanMessageCoach] = useState(true);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const permissionLabels = [
    ["canViewProgress", t.progress],
    ["canViewPayments", t.payments],
    ["canMessageCoach", t.coachChat],
  ] as const;

  const queryArgs = useMemo(
    () => ({ page: 1, limit: 100, search: search.trim() || undefined }),
    [search],
  );
  const { data: linksData, isLoading: linksLoading } =
    useGetAdminParentLinksQuery(queryArgs);
  const { data: parentsData, isLoading: parentsLoading } =
    useGetAdminParentAccountsQuery(queryArgs);
  const { data: playersData, isLoading: playersLoading } =
    useGetAdminLinkablePlayersQuery(queryArgs);
  const [createLink, createState] = useCreateAdminParentLinkMutation();
  const [updateLink] = useUpdateAdminParentLinkMutation();
  const [deleteLink, deleteState] = useDeleteAdminParentLinkMutation();

  const parents = parentsData?.data ?? [];
  const players = playersData?.data ?? [];
  const links = linksData?.data ?? [];
  const isBusy = linksLoading || parentsLoading || playersLoading;

  async function handleCreate() {
    if (!parentUserId || !playerId) return;
    setNotice(null);
    try {
      await createLink({
        parentUserId,
        playerId,
        relation,
        isPrimary,
        canViewProgress,
        canViewPayments,
        canMessageCoach,
      }).unwrap();
      setPlayerId("");
      setRelation("guardian");
      setIsPrimary(false);
      setCanViewProgress(true);
      setCanViewPayments(true);
      setCanMessageCoach(true);
      setNotice({ type: "success", text: t.createSuccess });
    } catch {
      setNotice({ type: "error", text: t.actionFailed });
    }
  }

  async function toggle(link: AdminParentLink, key: (typeof permissionLabels)[number][0]) {
    setNotice(null);
    try {
      await updateLink({
        parentLinkId: link.id,
        body: {
          [key]: !link[
            key === "canViewProgress"
              ? "can_view_progress"
              : key === "canViewPayments"
                ? "can_view_payments"
                : "can_message_coach"
          ],
        },
      }).unwrap();
      setNotice({ type: "success", text: t.updateSuccess });
    } catch {
      setNotice({ type: "error", text: t.actionFailed });
    }
  }

  async function makePrimary(link: AdminParentLink) {
    setNotice(null);
    try {
      await updateLink({
        parentLinkId: link.id,
        body: { isPrimary: !link.is_primary },
      }).unwrap();
      setNotice({ type: "success", text: t.updateSuccess });
    } catch {
      setNotice({ type: "error", text: t.actionFailed });
    }
  }

  async function removeLink(linkId: string) {
    if (!window.confirm(t.removeConfirm)) return;
    setNotice(null);
    try {
      await deleteLink(linkId).unwrap();
      setNotice({ type: "success", text: t.removeSuccess });
    } catch {
      setNotice({ type: "error", text: t.actionFailed });
    }
  }

  return (
    <div className="space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        description={t.description}
        breadcrumbs={[{ label: t.dashboard, href: "/admin/dashboard" }, { label: t.title }]}
      />

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border px-4 py-3 text-sm font-black ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
              : "border-rose-500/30 bg-rose-500/10 text-rose-500"
          }`}
        >
          {notice.text}
        </div>
      )}

      <Card className="border-border/50 bg-card">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl border border-border/40 bg-muted/20 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.search}
              className="h-10 w-full bg-transparent text-sm font-semibold outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm md:w-[420px]">
            <div className="rounded-2xl bg-muted/20 p-3">
              <strong className="block text-xl">{parents.length}</strong>
              <span className="text-muted-foreground">{t.parents}</span>
            </div>
            <div className="rounded-2xl bg-muted/20 p-3">
              <strong className="block text-xl">{players.length}</strong>
              <span className="text-muted-foreground">{t.players}</span>
            </div>
            <div className="rounded-2xl bg-muted/20 p-3">
              <strong className="block text-xl">{links.length}</strong>
              <span className="text-muted-foreground">{t.links}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Link2 className="h-4 w-4 text-primary" />
              {t.create}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{t.parentAccount}</label>
              <select
                value={parentUserId}
                onChange={(event) => setParentUserId(event.target.value)}
                className="h-11 w-full rounded-2xl border border-border/40 bg-muted/20 px-3 text-sm font-semibold outline-none"
              >
                <option value="">{t.chooseParent}</option>
                {parents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parentLabel(parent, t.parentFallback)} ({parent.linked_players_count ?? 0})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">{t.player}</label>
              <select
                value={playerId}
                onChange={(event) => setPlayerId(event.target.value)}
                className="h-11 w-full rounded-2xl border border-border/40 bg-muted/20 px-3 text-sm font-semibold outline-none"
              >
                <option value="">{t.choosePlayer}</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.full_name} {player.group_name ? `- ${player.group_name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold">{t.relation}</label>
                <input
                  value={relation}
                  onChange={(event) => setRelation(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-border/40 bg-muted/20 px-3 text-sm font-semibold outline-none"
                />
              </div>
              <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 px-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(event) => setIsPrimary(event.target.checked)}
                />
                {t.primaryChild}
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {permissionLabels.map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-2xl border border-border/40 bg-muted/20 p-3 text-sm font-semibold"
                >
                  <input
                    type="checkbox"
                    checked={
                      key === "canViewProgress"
                        ? canViewProgress
                        : key === "canViewPayments"
                          ? canViewPayments
                          : canMessageCoach
                    }
                    onChange={(event) => {
                      if (key === "canViewProgress") setCanViewProgress(event.target.checked);
                      if (key === "canViewPayments") setCanViewPayments(event.target.checked);
                      if (key === "canMessageCoach") setCanMessageCoach(event.target.checked);
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>

            <Button
              className="w-full"
              disabled={!parentUserId || !playerId || createState.isLoading}
              onClick={handleCreate}
            >
              {createState.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t.linkParent}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-4 w-4 text-primary" />
              {t.activeLinks}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isBusy ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.loading}
              </div>
            ) : (
              links.map((link) => (
                <article
                  key={link.id}
                  className="rounded-3xl border border-border/40 bg-muted/20 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-bold">{link.parent_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {link.parent_email || link.parent_phone || t.noContact} {t.linkedTo}{" "}
                          <strong>{link.player_name}</strong>
                        </p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          {link.relation} {link.is_primary ? `- ${t.primary}` : ""}{" "}
                          {link.group_name ? `- ${link.group_name}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={link.is_primary ? "default" : "outline"}
                        size="sm"
                        onClick={() => makePrimary(link)}
                      >
                        {t.primary}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deleteState.isLoading}
                        onClick={() => removeLink(link.id)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        {t.remove}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {permissionLabels.map(([key, label]) => {
                      const enabled =
                        key === "canViewProgress"
                          ? link.can_view_progress
                          : key === "canViewPayments"
                            ? link.can_view_payments
                            : link.can_message_coach;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggle(link, key)}
                          className={`flex min-h-11 items-center justify-between rounded-2xl border px-3 text-sm font-bold ${
                            enabled
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border/40 bg-background/40 text-muted-foreground"
                          }`}
                        >
                          <span>{label}</span>
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))
            )}

            {!isBusy && !links.length && (
              <div className="rounded-2xl border border-dashed border-border/40 p-8 text-center text-muted-foreground">
                {t.empty}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
