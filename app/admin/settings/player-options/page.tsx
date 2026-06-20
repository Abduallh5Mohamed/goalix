"use client";

import { useState } from "react";
import { CustomDataBuilder } from "@/components/custom-data/CustomDataBuilder";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetAcademyQuery,
  useGetCoachesQuery,
  useUpdateAcademyMutation,
} from "@/lib/store/api/adminApi";
import { CheckCircle, Loader2, Save } from "lucide-react";

type PlayerOptionsDraft = {
  playerCodePrefix?: string;
  profileCompletionMode?: string;
  requireGuardianContact?: boolean;
  allowCoachCustomFields?: boolean;
  measurementRatingMax?: string;
  defaultMeasurementFrequency?: string;
  playerEvaluationVisibility?: string;
  allowPlayersViewRankings?: boolean;
  defaultPlayerStatus?: string;
};

const getSettingRecord = (value: unknown) =>
  typeof value === "object" && value ? (value as Record<string, unknown>) : {};

const stringSetting = (
  draft: string | undefined,
  stored: unknown,
  fallback: string,
) => draft ?? (typeof stored === "string" ? stored : fallback);

const boolSetting = (
  draft: boolean | undefined,
  stored: unknown,
  fallback: boolean,
) => draft ?? (typeof stored === "boolean" ? stored : fallback);

export default function AdminPlayerOptionsPage() {
  const { data: coaches } = useGetCoachesQuery({ page: 1, limit: 200 });
  const { data: academy, isLoading } = useGetAcademyQuery();
  const [updateAcademy, { isLoading: saving }] = useUpdateAcademyMutation();
  const [draft, setDraft] = useState<PlayerOptionsDraft>({});
  const [saved, setSaved] = useState(false);

  const settings = (academy?.settings ?? {}) as Record<string, unknown>;
  const playerOptions = getSettingRecord(settings.playerOptions);

  const playerCodePrefix = stringSetting(
    draft.playerCodePrefix,
    playerOptions.playerCodePrefix,
    "GLX",
  );
  const profileCompletionMode = stringSetting(
    draft.profileCompletionMode,
    playerOptions.profileCompletionMode,
    "strict",
  );
  const measurementRatingMax = stringSetting(
    draft.measurementRatingMax,
    playerOptions.measurementRatingMax,
    "10",
  );
  const defaultMeasurementFrequency = stringSetting(
    draft.defaultMeasurementFrequency,
    playerOptions.defaultMeasurementFrequency,
    "monthly",
  );
  const playerEvaluationVisibility = stringSetting(
    draft.playerEvaluationVisibility,
    playerOptions.playerEvaluationVisibility,
    "published_only",
  );
  const defaultPlayerStatus = stringSetting(
    draft.defaultPlayerStatus,
    playerOptions.defaultPlayerStatus,
    "active",
  );
  const requireGuardianContact = boolSetting(
    draft.requireGuardianContact,
    playerOptions.requireGuardianContact,
    true,
  );
  const allowCoachCustomFields = boolSetting(
    draft.allowCoachCustomFields,
    playerOptions.allowCoachCustomFields,
    true,
  );
  const allowPlayersViewRankings = boolSetting(
    draft.allowPlayersViewRankings,
    playerOptions.allowPlayersViewRankings,
    true,
  );

  const setDraftValue = <K extends keyof PlayerOptionsDraft>(
    key: K,
    value: PlayerOptionsDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const savePlayerOptions = async () => {
    await updateAcademy({
      settings: {
        ...settings,
        playerOptions: {
          ...playerOptions,
          playerCodePrefix: playerCodePrefix.trim().toUpperCase(),
          profileCompletionMode,
          requireGuardianContact,
          allowCoachCustomFields,
          measurementRatingMax: Number(measurementRatingMax),
          defaultMeasurementFrequency,
          playerEvaluationVisibility,
          allowPlayersViewRankings,
          defaultPlayerStatus,
        },
      },
    }).unwrap();
    setDraft({});
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Player Options"
        description="Control player profile rules, measurement scale, and custom player data."
        breadcrumbs={[{ label: "Settings", href: "/admin/settings" }, { label: "Player Options" }]}
      />
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Player System Rules</CardTitle>
          </div>
          <Badge variant="outline">Academy scope</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Player Code Prefix</Label>
              <Input
                value={playerCodePrefix}
                maxLength={10}
                onChange={(event) =>
                  setDraftValue("playerCodePrefix", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Profile Completion</Label>
              <Select
                value={profileCompletionMode}
                onValueChange={(value) =>
                  setDraftValue("profileCompletionMode", value)
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Strict</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Measurement Rating Max</Label>
              <Select
                value={measurementRatingMax}
                onValueChange={(value) =>
                  setDraftValue("measurementRatingMax", value)
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Measurement Frequency</Label>
              <Select
                value={defaultMeasurementFrequency}
                onValueChange={(value) =>
                  setDraftValue("defaultMeasurementFrequency", value)
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Evaluation Visibility</Label>
              <Select
                value={playerEvaluationVisibility}
                onValueChange={(value) =>
                  setDraftValue("playerEvaluationVisibility", value)
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published_only">Published Only</SelectItem>
                  <SelectItem value="saved_and_published">Saved & Published</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Player Status</Label>
              <Select
                value={defaultPlayerStatus}
                onValueChange={(value) =>
                  setDraftValue("defaultPlayerStatus", value)
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["requireGuardianContact", "Guardian Contact", requireGuardianContact],
              ["allowCoachCustomFields", "Coach Custom Fields", allowCoachCustomFields],
              ["allowPlayersViewRankings", "Player Rankings", allowPlayersViewRankings],
            ].map(([key, label, value]) => (
              <label
                key={String(key)}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-muted/20 p-3 text-sm"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(event) =>
                    setDraftValue(
                      key as keyof PlayerOptionsDraft,
                      event.target.checked,
                    )
                  }
                />
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={savePlayerOptions} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Player Options
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <CheckCircle className="h-4 w-4" /> Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      <CustomDataBuilder role="admin" coaches={coaches?.data ?? []} />
    </div>
  );
}
