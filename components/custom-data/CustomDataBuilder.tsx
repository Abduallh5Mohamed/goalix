"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
  type CustomFieldType,
  type CustomField,
  useCreateCustomCategoryMutation,
  useCreateCustomFieldMutation,
  useCreateCustomFieldOptionMutation,
  useDeleteCustomCategoryMutation,
  useDeleteCustomFieldMutation,
  useGetCustomCategoriesQuery,
} from "@/lib/store/api/calendarApi";

type Role = "admin" | "coach";

interface CoachChoice {
  id: string;
  full_name?: string | null;
  fullName?: string | null;
  username?: string | null;
}

const fieldTypes: Array<{ value: CustomFieldType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "long_text", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "decimal", label: "Decimal Number" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "boolean", label: "Yes / No" },
  { value: "single_select", label: "Single Select" },
  { value: "multi_select", label: "Multi Select" },
  { value: "rating", label: "Rating" },
  { value: "percentage", label: "Percentage" },
  { value: "file", label: "File Upload" },
  { value: "image", label: "Image Upload" },
  { value: "url", label: "URL" },
  { value: "phone", label: "Phone Number" },
  { value: "email", label: "Email" },
];

const needsOptions = new Set<CustomFieldType>(["single_select", "multi_select"]);

const toKey = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const isProtectedSystemField = (field: Pick<CustomField, "key">) =>
  toKey(field.key) === "main_position";

export function CustomDataBuilder({ role, coaches = [] }: { role: Role; coaches?: CoachChoice[] }) {
  const { data: categories = [], isLoading } = useGetCustomCategoriesQuery({ role, targetModule: "player_profile" });
  const [createCategory, { isLoading: creatingCategory }] = useCreateCustomCategoryMutation();
  const [createField, { isLoading: creatingField }] = useCreateCustomFieldMutation();
  const [createOption, { isLoading: creatingOption }] = useCreateCustomFieldOptionMutation();
  const [deleteCategory] = useDeleteCustomCategoryMutation();
  const [deleteField, { isLoading: deletingField }] = useDeleteCustomFieldMutation();
  const [fieldDeleteTarget, setFieldDeleteTarget] = useState<CustomField | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    visibility: role === "admin" ? "global" : "coach_only",
    assignedCoachId: "",
  });
  const [fieldForm, setFieldForm] = useState({
    categoryId: "",
    label: "",
    key: "",
    fieldType: "text" as CustomFieldType,
    isRequired: true,
    unit: "",
  });
  const [optionForm, setOptionForm] = useState({
    fieldId: "",
    label: "",
  });

  const submitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createCategory({
      role,
      body: {
        name: categoryForm.name,
        description: categoryForm.description || undefined,
        targetModule: "player_profile",
        visibility: role === "admin" ? categoryForm.visibility : undefined,
        assignedCoachId: role === "admin" && categoryForm.visibility === "specific_coach" ? categoryForm.assignedCoachId : undefined,
        isEditableByCoach: role === "coach",
      },
    }).unwrap();
    setCategoryForm({ name: "", description: "", visibility: role === "admin" ? "global" : "coach_only", assignedCoachId: "" });
  };

  const submitField = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const createdField = await createField({
      role,
      categoryId: fieldForm.categoryId,
      body: {
        label: fieldForm.label,
        key: fieldForm.key || toKey(fieldForm.label),
        fieldType: fieldForm.fieldType,
        isRequired: fieldForm.isRequired,
        unit: fieldForm.unit || undefined,
      },
    }).unwrap();
    if (needsOptions.has(createdField.field_type)) {
      setOptionForm((current) => ({ ...current, fieldId: createdField.id }));
    }
    setFieldForm((current) => ({ ...current, label: "", key: "", fieldType: "text", isRequired: true, unit: "" }));
  };

  const submitOption = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createOption({
      role,
      fieldId: optionForm.fieldId,
      body: { label: optionForm.label },
    }).unwrap();
    setOptionForm((current) => ({ ...current, label: "" }));
  };

  const ownCanDelete = (createdByRole: "admin" | "coach") => role === "admin" || createdByRole === "coach";
  const canManageField = (field: CustomField) =>
    ownCanDelete(field.created_by_role) && !isProtectedSystemField(field);
  const categoryHasProtectedField = (category: { fields: CustomField[] }) =>
    category.fields.some(isProtectedSystemField);
  const optionFields = categories
    .flatMap((category) => category.fields)
    .filter((field) => needsOptions.has(field.field_type) && !isProtectedSystemField(field));

  return (
    <div className="space-y-6">
      <Dialog
        open={Boolean(fieldDeleteTarget)}
        onOpenChange={(open) => !open && setFieldDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Field?</DialogTitle>
            <DialogDescription>
              This will remove the field from the profile form and delete every
              saved player value for it. Existing players will look as if this
              field never existed.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Field: {fieldDeleteTarget?.label}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFieldDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-2"
              disabled={deletingField || !fieldDeleteTarget}
              onClick={async () => {
                if (!fieldDeleteTarget) return;
                await deleteField({ role, id: fieldDeleteTarget.id }).unwrap();
                setFieldDeleteTarget(null);
              }}
            >
              {deletingField && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Field And Values
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <form className="space-y-3" onSubmit={submitCategory}>
              <div>
                <Label>Category / Section</Label>
                <Input value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} placeholder="Football Information" required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              {role === "admin" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Visibility</Label>
                    <Select value={categoryForm.visibility} onValueChange={(value) => setCategoryForm((p) => ({ ...p, visibility: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                        <SelectItem value="specific_coach">Specific Coach</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {categoryForm.visibility === "specific_coach" && (
                    <div>
                      <Label>Coach</Label>
                      <Select value={categoryForm.assignedCoachId} onValueChange={(value) => setCategoryForm((p) => ({ ...p, assignedCoachId: value }))}>
                        <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                        <SelectContent>
                          {coaches.map((coach) => (
                            <SelectItem key={coach.id} value={coach.id}>{coach.full_name || coach.fullName || coach.username || coach.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
              <Button type="submit" disabled={creatingCategory || !categoryForm.name || (role === "admin" && categoryForm.visibility === "specific_coach" && !categoryForm.assignedCoachId)} className="w-full gap-2">
                {creatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Category
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <form className="space-y-3" onSubmit={submitField}>
              <div>
                <Label>Category</Label>
                <Select value={fieldForm.categoryId} onValueChange={(value) => setFieldForm((p) => ({ ...p, categoryId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter((category) => ownCanDelete(category.created_by_role)).map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Field Label</Label>
                  <Input value={fieldForm.label} onChange={(e) => setFieldForm((p) => ({ ...p, label: e.target.value, key: p.key || toKey(e.target.value) }))} placeholder="Main Position" required />
                </div>
                <div>
                  <Label>Field Key</Label>
                  <Input value={fieldForm.key} onChange={(e) => setFieldForm((p) => ({ ...p, key: e.target.value }))} placeholder="main_position" required />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Field Type</Label>
                  <Select value={fieldForm.fieldType} onValueChange={(value) => setFieldForm((p) => ({ ...p, fieldType: value as CustomFieldType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{fieldTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input value={fieldForm.unit} onChange={(e) => setFieldForm((p) => ({ ...p, unit: e.target.value }))} placeholder="cm, kg, %" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={fieldForm.isRequired} onChange={(e) => setFieldForm((p) => ({ ...p, isRequired: e.target.checked }))} />
                Required for profile completion
              </label>
              <Button type="submit" disabled={creatingField || !fieldForm.categoryId || !fieldForm.label || !fieldForm.key} className="w-full gap-2">
                {creatingField ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Field
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <form className="space-y-3" onSubmit={submitOption}>
              {!optionFields.length && (
                <p className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                  Create a Single Select or Multi Select field first, then add options here.
                </p>
              )}
              <div>
                <Label>Select Field</Label>
                <Select value={optionForm.fieldId} onValueChange={(value) => setOptionForm((p) => ({ ...p, fieldId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Field with options" /></SelectTrigger>
                  <SelectContent>
                    {optionFields.filter((field) => ownCanDelete(field.created_by_role)).map((field) => (
                      <SelectItem key={field.id} value={field.id}>{field.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Option Label</Label>
                <Input value={optionForm.label} onChange={(e) => setOptionForm((p) => ({ ...p, label: e.target.value }))} placeholder="Striker" required />
              </div>
              <Button type="submit" disabled={creatingOption || !optionForm.fieldId || !optionForm.label} className="w-full gap-2">
                {creatingOption ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Option
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card><CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading custom data...</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <Card key={category.id} className="border-border/50 bg-card">
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <Badge variant={category.created_by_role === "admin" ? "default" : "secondary"}>{category.created_by_role}</Badge>
                      <Badge variant="outline">{category.visibility}</Badge>
                    </div>
                    {category.description && <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>}
                  </div>
                  {ownCanDelete(category.created_by_role) && !categoryHasProtectedField(category) && (
                    <Button variant="outline" size="icon" onClick={() => deleteCategory({ role, id: category.id })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {category.fields.map((field) => (
                    <div key={field.id} className="rounded-md border border-border/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{field.label}</p>
                          <p className="text-xs text-muted-foreground">{field.key} - {field.field_type.replace("_", " ")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {field.is_required && <Badge variant="warning">Required</Badge>}
                          {isProtectedSystemField(field) && <Badge variant="info">System</Badge>}
                          {canManageField(field) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setFieldDeleteTarget(field)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {field.options.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {field.options.map((option) => <Badge key={option.id} variant="outline">{option.label}</Badge>)}
                        </div>
                      )}
                    </div>
                  ))}
                  {!category.fields.length && <p className="text-sm text-muted-foreground">No fields yet.</p>}
                </div>
              </CardContent>
            </Card>
          ))}
          {!categories.length && <Card><CardContent className="p-8 text-center text-muted-foreground">No custom player data structure yet.</CardContent></Card>}
        </div>
      )}
    </div>
  );
}
