"use client";

import { CustomDataBuilder } from "@/components/custom-data/CustomDataBuilder";
import { PageHeader } from "@/components/shared/PageHeader";

export default function CoachPlayerOptionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom Player Data"
        description="Create your own player profile sections and fields. Admin-created data is visible but read-only."
        breadcrumbs={[{ label: "Home", href: "/coach/home" }, { label: "Custom Player Data" }]}
      />
      <CustomDataBuilder role="coach" />
    </div>
  );
}
