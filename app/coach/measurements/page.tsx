"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetCoachGroupQuery,
  useGetCoachGroupsQuery,
  useSaveCoachMeasurementsMutation,
} from "@/lib/store/api/coachApi";
import { getInitials } from "@/lib/utils";
import { CheckCircle2, Loader2, RefreshCw, Ruler, Save, Search } from "lucide-react";

type MeasurementDraft = {
  heightCm: string;
  weightKg: string;
  sprintSpeed: string;
  stamina: string;
  flexibility: string;
  notes: string;
};

type MeasurementKey = keyof MeasurementDraft;

const emptyDraft: MeasurementDraft = {
  heightCm: "",
  weightKg: "",
  sprintSpeed: "",
  stamina: "",
  flexibility: "",
  notes: "",
};

const fields: {
  key: Exclude<MeasurementKey, "notes">;
  label: string;
  placeholder: string;
  min?: number;
  max?: number;
}[] = [
  { key: "heightCm", label: "Height (cm)", placeholder: "152" },
  { key: "weightKg", label: "Weight (kg)", placeholder: "42" },
  { key: "sprintSpeed", label: "Sprint (s)", placeholder: "7.0", min: 0, max: 10 },
  { key: "stamina", label: "Endurance (/10)", placeholder: "8.5", min: 0, max: 10 },
  { key: "flexibility", label: "Flexibility (/10)", placeholder: "7.5", min: 0, max: 10 },
];

const toNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toTenPointValue = (value: number | undefined) => {
  if (!value) return "";
  const normalized = value > 10 ? value / 10 : value;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
};

export default function CoachMeasurementsPage() {
  const { data: groups = [], isLoading: loadingGroups, isError: groupsError, refetch } =
    useGetCoachGroupsQuery();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [search, setSearch] = useState("");
  const [measurementMonth, setMeasurementMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const selectedGroup = selectedGroupId || groups[0]?.id || "";
  const { data: groupDetail, isFetching: loadingPlayers } = useGetCoachGroupQuery(
    { groupId: selectedGroup, month: measurementMonth },
    { skip: !selectedGroup }
  );
  const players = useMemo(() => groupDetail?.players ?? [], [groupDetail?.players]);
  const visiblePlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return players;
    return players.filter((player) =>
      [
        player.fullName,
        player.position,
        player.groupName,
        player.branchName,
        player.parentPhone,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [players, search]);
  const [measurements, setMeasurements] = useState<Record<string, MeasurementDraft>>({});
  const [saved, setSaved] = useState(false);
  const [saveMeasurements, { isLoading: isSaving, error: saveError }] =
    useSaveCoachMeasurementsMutation();

  const draftFromPlayer = (player: (typeof players)[number]) => {
    return {
      ...emptyDraft,
      heightCm: player.height ? String(player.height) : "",
      weightKg: player.weight ? String(player.weight) : "",
      sprintSpeed: toTenPointValue(player.sprintSpeed),
      stamina: toTenPointValue(player.stamina),
      flexibility: toTenPointValue(player.flexibility),
      notes: player.measurementNotes || "",
    };
  };

  const handleChange = (
    player: (typeof players)[number],
    field: MeasurementKey,
    value: string,
  ) => {
    setMeasurements((prev) => ({
      ...prev,
      [player.id]: { ...(prev[player.id] ?? draftFromPlayer(player)), [field]: value },
    }));
    setSaved(false);
  };

  const getDraft = (player: (typeof players)[number]) =>
    measurements[player.id] ?? draftFromPlayer(player);

  const handleSave = async () => {
    const measuredAt = `${measurementMonth}-01`;
    const records = players
      .map((player) => {
        const draft = measurements[player.id] ?? emptyDraft;
        return {
          playerId: player.id,
          heightCm: toNumber(draft.heightCm),
          weightKg: toNumber(draft.weightKg),
          sprintSpeed: toNumber(draft.sprintSpeed),
          stamina: toNumber(draft.stamina),
          flexibility: toNumber(draft.flexibility),
          notes: draft.notes.trim() || undefined,
          measuredAt,
        };
      })
      .filter((record) =>
        [
          record.heightCm,
          record.weightKg,
          record.sprintSpeed,
          record.stamina,
          record.flexibility,
          record.notes,
        ].some((value) => value !== undefined)
      );

    if (!records.length) return;

    await saveMeasurements({ records }).unwrap();
    setSaved(true);
    setMeasurements({});
    window.setTimeout(() => setSaved(false), 3000);
  };

  const hasDrafts = Object.values(measurements).some((draft) =>
    Object.values(draft).some((value) => value.trim().length > 0)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Player Measurements"
        description="Record monthly physical measurements for your players"
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Measurements" },
        ]}
      />

      {groupsError && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="flex items-center justify-between gap-3 p-4 text-sm text-red-300">
            <span>Could not load your groups.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 bg-card">
        <CardContent className="grid gap-4 p-4 lg:grid-cols-[240px_180px_1fr]">
          <div>
            <Label className="mb-2 block text-sm">Group</Label>
            <Select
              value={selectedGroup}
              onValueChange={(value) => {
                setSelectedGroupId(value);
                setMeasurements({});
                setSaved(false);
              }}
              disabled={loadingGroups || groups.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingGroups ? "Loading groups..." : "Select group"}
                />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="measurement-month" className="mb-2 block text-sm">
              Measurement month
            </Label>
            <Input
              id="measurement-month"
              type="month"
              value={measurementMonth}
              onChange={(event) => {
                setMeasurementMonth(event.target.value);
                setMeasurements({});
                setSaved(false);
              }}
            />
          </div>

          <div>
            <Label htmlFor="player-search" className="mb-2 block text-sm">
              Search players
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="player-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, position, group, branch, or phone"
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingGroups || loadingPlayers ? (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading players...
          </CardContent>
        </Card>
      ) : null}

      {!loadingGroups && groups.length === 0 && (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            No groups assigned yet.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {visiblePlayers.map((player) => {
          const draft = getDraft(player);

          return (
            <Card key={player.id} className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/20 text-sm text-primary">
                        {getInitials(player.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        {player.fullName}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {player.position} - Age {player.age} - {player.groupName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Ruler className="h-3.5 w-3.5" />
                    <span>
                      Latest: {player.height || "--"}cm / {player.weight || "--"}kg
                      {player.sprintSpeed ? ` / ${toTenPointValue(player.sprintSpeed)}s` : ""}
                      {player.stamina ? ` / End ${toTenPointValue(player.stamina)}` : ""}
                      {player.flexibility ? ` / Flex ${toTenPointValue(player.flexibility)}` : ""}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <Label className="mb-1 block text-[10px] text-muted-foreground">
                        {field.label}
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min={field.min}
                        max={field.max}
                        placeholder={field.placeholder}
                        value={draft[field.key]}
                        onChange={(event) =>
                          handleChange(player, field.key, event.target.value)
                        }
                        className="text-center"
                      />
                    </div>
                  ))}
                  <div className="col-span-2 lg:col-span-1">
                    <Label className="mb-1 block text-[10px] text-muted-foreground">
                      Notes
                    </Label>
                    <Input
                      placeholder="Optional"
                      value={draft.notes}
                      onChange={(event) =>
                        handleChange(player, "notes", event.target.value)
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!loadingGroups && !loadingPlayers && players.length > 0 && !visiblePlayers.length && (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            No players match your search.
          </CardContent>
        </Card>
      )}

      {saveError && (
        <p className="text-sm text-red-400">
          Could not save measurements. Please check the values.
        </p>
      )}

      {players.length > 0 && (
        <div className="sticky bottom-4 flex justify-end">
          <Button
            size="lg"
            onClick={handleSave}
            disabled={isSaving || !hasDrafts}
            className={saved ? "bg-lime-300 text-slate-950 hover:bg-lime-200" : ""}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Saved
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Save Measurements
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
