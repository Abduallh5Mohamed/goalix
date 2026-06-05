"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ChevronRight,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCompleteCoachPlayerProfileMutation,
  useCreateCoachBasicPlayerMutation,
  type CustomField,
  useGetCoachPlayerCustomProfileQuery,
  useGetCoachPlayersScopedQuery,
  useGetCustomCategoriesQuery,
  useUploadCoachPlayerImageMutation,
} from "@/lib/store/api/calendarApi";
import {
  useGetCoachAccessStatusQuery,
  useGetCoachBirthdaysQuery,
} from "@/lib/store/api/coachApi";
import { getInitials } from "@/lib/utils";

const GUARDIAN_RELATIONS = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "paternal_uncle", label: "Paternal Uncle" },
  { value: "maternal_uncle", label: "Maternal Uncle" },
  { value: "paternal_aunt", label: "Paternal Aunt" },
  { value: "maternal_aunt", label: "Maternal Aunt" },
  { value: "grandfather", label: "Grandfather" },
  { value: "grandmother", label: "Grandmother" },
  { value: "older_brother", label: "Older Brother" },
  { value: "older_sister", label: "Older Sister" },
  { value: "legal_guardian", label: "Legal Guardian" },
  { value: "other", label: "Other" },
];

type ApiErrorDetails = {
  data?: {
    error?: {
      message?: string;
      details?: { message?: string }[];
    };
  };
};

function getApiErrorMessage(err: unknown, fallback: string) {
  const apiError = err as ApiErrorDetails;
  const detailMessages = apiError.data?.error?.details
    ?.map((detail) => detail.message)
    .filter(Boolean);

  return detailMessages?.length
    ? detailMessages.join(". ")
    : (apiError.data?.error?.message ?? fallback);
}

function calculateAge(birthDate: string) {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()))
    age -= 1;
  return age >= 0 ? String(age) : "";
}

const normalizeKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const textValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const joined = value.map(textValue).filter(Boolean).join(", ");
    return joined || null;
  }
  return null;
};

const customProfileValue = (
  player: { customProfile?: Array<{ key: string; label: string; value: unknown }> },
  keys: string[],
) => {
  const normalizedKeys = new Set(keys.map(normalizeKey));
  for (const field of player.customProfile ?? []) {
    if (
      normalizedKeys.has(normalizeKey(field.key)) ||
      normalizedKeys.has(normalizeKey(field.label))
    ) {
      const value = textValue(field.value);
      if (value) return value;
    }
  }
  return null;
};

const mainPositionForPlayer = (
  player: {
    position?: string | null;
    customProfile?: Array<{ key: string; label: string; value: unknown }>;
  },
) =>
  customProfileValue(player, ["main_position", "main position"]) ||
  player.position ||
  null;

function CoachPlayersFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

export default function CoachPlayersPage() {
  return (
    <Suspense fallback={<CoachPlayersFallback />}>
      <CoachPlayersContent />
    </Suspense>
  );
}

function CoachPlayersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState({
    search: "",
    status: "all",
    customFieldId: "",
    customValue: "",
    customOptionId: "",
  });
  const { data: customCategories = [] } = useGetCustomCategoriesQuery({
    role: "coach",
    targetModule: "player_profile",
  });
  const { data: playersRes, isLoading } = useGetCoachPlayersScopedQuery({
    customFieldId: filter.customFieldId || undefined,
    customValue: filter.customValue || undefined,
    customOptionId: filter.customOptionId || undefined,
  });
  const { data: accessStatus } = useGetCoachAccessStatusQuery();
  const { data: birthdays = [] } = useGetCoachBirthdaysQuery();
  const [addOpen, setAddOpen] = useState(false);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const emptyBasicForm = () => ({
    fullName: "",
    birthDate: "",
    branchId: "",
    heightCm: "",
    weightKg: "",
    preferredFoot: "",
    dateJoined: new Date().toISOString().slice(0, 10),
    username: "",
    password: "",
    gender: "",
    nationality: "",
    phone: "",
    address: "",
    guardianName: "",
    guardianPhone: "",
    guardianRelation: "",
  });
  const [basic, setBasic] = useState(emptyBasicForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [createError, setCreateError] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [createPlayer, { isLoading: creating }] =
    useCreateCoachBasicPlayerMutation();
  const [uploadPlayerImage, { isLoading: uploadingImage }] =
    useUploadCoachPlayerImageMutation();
  const [completeProfile, { isLoading: completing }] =
    useCompleteCoachPlayerProfileMutation();
  const [completeError, setCompleteError] = useState("");
  const { data: customProfile, isLoading: loadingCustomProfile } =
    useGetCoachPlayerCustomProfileQuery(completeId ?? "", {
      skip: !completeId,
    });

  const initialCustomValues = useMemo(() => {
    const next: Record<string, unknown> = {};
    if (!customProfile) return next;
    for (const category of customProfile.categories) {
      for (const field of category.fields) {
        if (field.default_value !== null && field.default_value !== undefined)
          next[field.id] = field.default_value;
      }
    }
    for (const value of customProfile.values) {
      next[value.field_id] = value.value;
    }
    return next;
  }, [customProfile]);
  const effectiveCustomValues = useMemo(
    () => ({ ...initialCustomValues, ...customValues }),
    [customValues, initialCustomValues],
  );

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    if (!hasAssignments) {
      setCreateError("Your coach account has not been assigned yet.");
      return;
    }
    const requiredValues = [
      basic.fullName.trim(),
      basic.birthDate,
      basic.branchId,
      basic.heightCm,
      basic.weightKg,
      basic.preferredFoot,
      basic.dateJoined,
      basic.username.trim(),
      basic.password,
      basic.gender,
      basic.nationality.trim(),
      basic.phone.trim(),
      basic.address.trim(),
      basic.guardianName.trim(),
      basic.guardianPhone.trim(),
      basic.guardianRelation,
    ];
    if (requiredValues.some((value) => !value)) {
      setCreateError("Fill all required player basics. Photo is optional.");
      return;
    }
    if (Number(basic.heightCm) <= 0 || Number(basic.weightKg) <= 0) {
      setCreateError("Height and weight must be valid positive numbers.");
      return;
    }

    try {
      const uploadedImage = imageFile
        ? await uploadPlayerImage(imageFile).unwrap()
        : null;
      await createPlayer({
        ...basic,
        photoUrl: uploadedImage?.image,
        heightCm: Number(basic.heightCm),
        weightKg: Number(basic.weightKg),
      }).unwrap();
      setAddOpen(false);
      setBasic(emptyBasicForm());
      setImageFile(null);
    } catch (err) {
      setCreateError(getApiErrorMessage(err, "Could not create player."));
    }
  };

  const handleComplete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!completeId) return;
    setCompleteError("");
    try {
      await completeProfile({
        id: completeId,
        body: {
          customValues: Object.entries(effectiveCustomValues).map(
            ([fieldId, value]) => ({ fieldId, value }),
          ),
        },
      }).unwrap();
      setCompleteId(null);
      setCustomValues({});
      router.replace("/coach/players");
    } catch (err) {
      setCompleteError(
        getApiErrorMessage(err, "Could not complete player profile."),
      );
    }
  };

  const serverPlayers = useMemo(
    () => playersRes?.data ?? [],
    [playersRes?.data],
  );

  useEffect(() => {
    const completePlayerId = searchParams.get("complete");
    if (
      completePlayerId &&
      completePlayerId !== completeId &&
      serverPlayers.some((player) => player.id === completePlayerId)
    ) {
      const timeoutId = window.setTimeout(() => {
        setCustomValues({});
        setCompleteError("");
        setCompleteId(completePlayerId);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [completeId, searchParams, serverPlayers]);
  const filterFields = customCategories.flatMap((category) => category.fields);
  const selectedFilterField = filterFields.find(
    (field) => field.id === filter.customFieldId,
  );
  const selectedFilterFieldUsesOptions =
    selectedFilterField?.field_type === "single_select" ||
    selectedFilterField?.field_type === "multi_select";
  const hasActiveFilters = Boolean(
    filter.search.trim() ||
    filter.customFieldId ||
    filter.customValue ||
    filter.customOptionId ||
    filter.status !== "all",
  );
  const players = useMemo(() => {
    const search = filter.search.trim().toLowerCase();
    return serverPlayers.filter((player) => {
      if (filter.status !== "all" && player.profile_status !== filter.status)
        return false;
      if (!search) return true;
      const mainPosition = mainPositionForPlayer(player);
      const haystack = [
        player.full_name,
        mainPosition,
        player.guardian_name,
        player.guardian_phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [filter.search, filter.status, serverPlayers]);
  const hasAssignments = accessStatus?.hasAssignments ?? birthdays.length > 0;
  const assignedBranches = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    birthdays.forEach((birthday) =>
      byId.set(birthday.branchId, {
        id: birthday.branchId,
        name: birthday.branchName,
      }),
    );
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [birthdays]);

  const setCustomValue = (fieldId: string, value: unknown) => {
    setCustomValues((current) => ({ ...current, [fieldId]: value }));
  };

  const toggleMultiValue = (
    fieldId: string,
    optionId: string,
    checked: boolean,
  ) => {
    const current = Array.isArray(customValues[fieldId])
      ? (customValues[fieldId] as string[])
      : [];
    const next = checked
      ? [...new Set([...current, optionId])]
      : current.filter((id) => id !== optionId);
    setCustomValue(fieldId, next);
  };

  const renderCustomField = (field: CustomField) => {
    const value = effectiveCustomValues[field.id];
    const label = (
      <Label>
        {field.label}
        {field.is_required ? " *" : ""}
        {field.unit ? ` (${field.unit})` : ""}
      </Label>
    );

    if (field.field_type === "long_text") {
      return (
        <div key={field.id} className="space-y-2">
          {label}
          <Textarea
            value={String(value ?? "")}
            onChange={(e) => setCustomValue(field.id, e.target.value)}
            placeholder={field.placeholder ?? undefined}
            required={field.is_required}
          />
        </div>
      );
    }

    if (field.field_type === "single_select") {
      return (
        <div key={field.id} className="space-y-2">
          {label}
          <Select
            value={String(value ?? "")}
            onValueChange={(next) => setCustomValue(field.id, next)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder ?? "Select option"} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.field_type === "multi_select") {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div key={field.id} className="space-y-2">
          {label}
          <div className="grid gap-2 rounded-md border border-border/60 p-3 sm:grid-cols-2">
            {field.options.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.id)}
                  onChange={(e) =>
                    toggleMultiValue(field.id, option.id, e.target.checked)
                  }
                />
                {option.label}
              </label>
            ))}
            {!field.options.length && (
              <p className="text-sm text-muted-foreground">
                No options configured.
              </p>
            )}
          </div>
        </div>
      );
    }

    if (field.field_type === "boolean") {
      return (
        <label
          key={field.id}
          className="flex items-center gap-2 rounded-md border border-border/60 p-3 text-sm"
        >
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => setCustomValue(field.id, e.target.checked)}
          />
          {field.label}
          {field.is_required ? " *" : ""}
        </label>
      );
    }

    if (field.field_type === "file" || field.field_type === "image") {
      return (
        <div key={field.id} className="space-y-2">
          {label}
          <Input
            type="file"
            accept={field.field_type === "image" ? "image/*" : undefined}
            onChange={(e) => {
              const file = e.target.files?.[0];
              setCustomValue(
                field.id,
                file
                  ? {
                      fileName: file.name,
                      fileType: file.type,
                      size: file.size,
                    }
                  : null,
              );
            }}
            required={field.is_required && !value}
          />
        </div>
      );
    }

    const inputTypeByField: Partial<Record<CustomField["field_type"], string>> =
      {
        number: "number",
        decimal: "number",
        rating: "number",
        percentage: "number",
        date: "date",
        time: "time",
        url: "url",
        phone: "tel",
        email: "email",
      };

    return (
      <div key={field.id} className="space-y-2">
        {label}
        <Input
          type={inputTypeByField[field.field_type] ?? "text"}
          value={String(value ?? "")}
          onChange={(e) => setCustomValue(field.id, e.target.value)}
          placeholder={field.placeholder ?? undefined}
          required={field.is_required}
          min={field.min_value != null ? Number(field.min_value) : undefined}
          max={field.max_value != null ? Number(field.max_value) : undefined}
          step={field.field_type === "decimal" ? "0.01" : undefined}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Players"
        description="Create a basic player first, then complete the profile before football operations."
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Players" },
        ]}
        actions={
          <Button
            className="gap-2"
            disabled={!hasAssignments}
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Player
          </Button>
        }
      />

      <Card className="border-border/50 bg-card">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.2fr)_180px_minmax(220px,1fr)_minmax(220px,1fr)_auto]">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={filter.search}
                  onChange={(e) =>
                    setFilter((p) => ({ ...p, search: e.target.value }))
                  }
                  placeholder="Search name, position, guardian..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filter.status}
                onValueChange={(value) =>
                  setFilter((p) => ({ ...p, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All players</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filter by custom field</Label>
              <Select
                value={filter.customFieldId}
                onValueChange={(value) =>
                  setFilter((p) => ({
                    ...p,
                    customFieldId: value,
                    customValue: "",
                    customOptionId: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose field" />
                </SelectTrigger>
                <SelectContent>
                  {filterFields.map((field) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.label} ({field.field_type.replace("_", " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              {selectedFilterFieldUsesOptions ? (
                <Select
                  value={filter.customOptionId}
                  onValueChange={(value) =>
                    setFilter((p) => ({
                      ...p,
                      customOptionId: value,
                      customValue: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose option" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedFilterField.options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={
                    selectedFilterField?.field_type === "date"
                      ? "date"
                      : selectedFilterField?.field_type === "number" ||
                          selectedFilterField?.field_type === "decimal"
                        ? "number"
                        : "text"
                  }
                  value={filter.customValue}
                  onChange={(e) =>
                    setFilter((p) => ({
                      ...p,
                      customValue: e.target.value,
                      customOptionId: "",
                    }))
                  }
                  placeholder={
                    selectedFilterField
                      ? "Search custom value"
                      : "Choose a custom field first"
                  }
                  disabled={!filter.customFieldId}
                />
              )}
            </div>
            <Button
              variant="outline"
              className="self-end"
              disabled={!hasActiveFilters}
              onClick={() =>
                setFilter({
                  search: "",
                  status: "all",
                  customFieldId: "",
                  customValue: "",
                  customOptionId: "",
                })
              }
            >
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{players.length} shown</Badge>
            <span>
              Filtering scans your assigned birthdays and groups only.
            </span>
            {selectedFilterFieldUsesOptions &&
              !selectedFilterField.options.length && (
                <span className="text-amber-300">
                  This field has no options yet.
                </span>
              )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={addOpen}
        onOpenChange={(nextOpen) => {
          setAddOpen(nextOpen);
          if (!nextOpen) setImageFile(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Basic Player Info</DialogTitle>
            <DialogDescription>
              Create the required player basics before completing custom profile
              fields.
            </DialogDescription>
          </DialogHeader>
          <form
            className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
            onSubmit={handleAdd}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={basic.fullName}
                  onChange={(e) =>
                    setBasic((p) => ({ ...p, fullName: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Birth Date</Label>
                <Input
                  type="date"
                  value={basic.birthDate}
                  onChange={(e) =>
                    setBasic((p) => ({ ...p, birthDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input
                  value={calculateAge(basic.birthDate)}
                  readOnly
                  placeholder="Auto calculated"
                />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={basic.branchId}
                  onValueChange={(value) =>
                    setBasic((p) => ({ ...p, branchId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The player will be matched automatically to an assigned
                  birthday by birth date.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Height (cm)</Label>
                <Input
                  type="number"
                  min={1}
                  max={250}
                  value={basic.heightCm}
                  onChange={(e) =>
                    setBasic((p) => ({ ...p, heightCm: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={basic.weightKg}
                  onChange={(e) =>
                    setBasic((p) => ({ ...p, weightKg: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred Foot</Label>
                <Select
                  value={basic.preferredFoot}
                  onValueChange={(value) =>
                    setBasic((p) => ({ ...p, preferredFoot: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose foot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date Joined Academy</Label>
                <Input
                  type="date"
                  value={basic.dateJoined}
                  onChange={(e) =>
                    setBasic((p) => ({ ...p, dateJoined: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={basic.gender}
                  onValueChange={(value) =>
                    setBasic((p) => ({ ...p, gender: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input
                  value={basic.nationality}
                  onChange={(e) =>
                    setBasic((p) => ({ ...p, nationality: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={basic.phone}
                  onChange={(e) =>
                    setBasic((p) => ({ ...p, phone: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={basic.username}
                  onChange={(e) =>
                    setBasic((p) => ({ ...p, username: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={basic.password}
                  onChange={(e) =>
                    setBasic((p) => ({ ...p, password: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Guardian Phone</Label>
                <Input
                  value={basic.guardianPhone}
                  onChange={(e) =>
                    setBasic((p) => ({ ...p, guardianPhone: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Guardian Relation</Label>
                <Select
                  value={basic.guardianRelation}
                  onValueChange={(value) =>
                    setBasic((p) => ({ ...p, guardianRelation: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose relation" />
                  </SelectTrigger>
                  <SelectContent>
                    {GUARDIAN_RELATIONS.map((relation) => (
                      <SelectItem key={relation.value} value={relation.value}>
                        {relation.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Photo (optional)</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
                {imageFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected {imageFile.name}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Guardian Name</Label>
              <Input
                value={basic.guardianName}
                onChange={(e) =>
                  setBasic((p) => ({ ...p, guardianName: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={basic.address}
                onChange={(e) =>
                  setBasic((p) => ({ ...p, address: e.target.value }))
                }
                required
              />
            </div>
            {createError && (
              <p className="text-sm text-red-400">{createError}</p>
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  creating ||
                  uploadingImage ||
                  !basic.branchId ||
                  !hasAssignments
                }
                className="gap-2"
              >
                {(creating || uploadingImage) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Save Basic Info
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(completeId)}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteId(null);
            setCustomValues({});
            setCompleteError("");
            router.replace("/coach/players");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Complete Player Custom Profile</DialogTitle>
            <DialogDescription>
              Fill required custom fields before this player becomes ready for
              football operations.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleComplete}>
            {loadingCustomProfile ? (
              <div className="flex items-center gap-2 rounded-md border border-border/60 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading custom profile fields...
              </div>
            ) : (
              <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
                {customProfile?.categories.map((category) => (
                  <section key={category.id} className="space-y-3">
                    <div>
                      <h3 className="font-semibold">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {category.fields.map(renderCustomField)}
                    </div>
                  </section>
                ))}
                {!customProfile?.categories.length && (
                  <p className="rounded-md border border-border/60 p-4 text-sm text-muted-foreground">
                    No custom fields configured yet. The player can be completed
                    once the profile structure is added.
                  </p>
                )}
              </div>
            )}
            {completeError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {completeError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={completing || loadingCustomProfile}
                className="gap-2"
              >
                {completing && <Loader2 className="h-4 w-4 animate-spin" />}
                Complete Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading players...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {players.map((player) => {
            const mainPosition = mainPositionForPlayer(player);
            return (
              <Card
                key={player.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer border-border/50 bg-card transition hover:border-primary/50 hover:bg-muted/30"
                onClick={() => router.push(`/coach/players/${player.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/coach/players/${player.id}`);
                  }
                }}
              >
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {getInitials(player.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{player.full_name}</p>
                        <Badge
                          variant={
                            player.profile_status === "complete"
                              ? "success"
                              : "warning"
                          }
                        >
                          {player.profile_status === "complete"
                            ? "Complete"
                            : "Incomplete"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {mainPosition || "Main position not set"} -{" "}
                        {player.guardian_phone || "No guardian phone"}
                      </p>
                    </div>
                  </div>
                  {player.profile_status !== "complete" ? (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        setCustomValues({});
                        setCompleteError("");
                        setCompleteId(player.id);
                      }}
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Complete profile
                    </Button>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-emerald-400">
                        <UserCheck className="h-4 w-4" />
                        Ready for operations
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {!players.length && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No players in your assigned birthdays.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
