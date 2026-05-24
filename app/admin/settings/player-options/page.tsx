"use client";

import { CustomDataBuilder } from "@/components/custom-data/CustomDataBuilder";
import { PageHeader } from "@/components/shared/PageHeader";
import { useGetCoachesQuery } from "@/lib/store/api/adminApi";

export default function AdminPlayerOptionsPage() {
  const { data: coaches } = useGetCoachesQuery({ page: 1, limit: 200 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom Player Data"
        description="Build player profile sections, fields, and options without hardcoding them."
        breadcrumbs={[{ label: "Settings", href: "/admin/settings" }, { label: "Custom Player Data" }]}
      />
      <CustomDataBuilder role="admin" coaches={coaches?.data ?? []} />
    </div>
  );
}
