"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Building } from "lucide-react";

export default function AcademyProfilePage() {
  const [name, setName] = useState("GOLX Sports Academy");
  const [email, setEmail] = useState("info@golxacademy.com");
  const [phone, setPhone] = useState("+20 100 123 4567");
  const [address, setAddress] = useState("Cairo, Egypt");

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Academy Profile"
        description="Manage your academy information and branding."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Settings" },
          { label: "Academy Profile" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Academy Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <Button className="gap-1.5">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 bg-card h-fit">
          <CardHeader>
            <CardTitle className="text-base">Logo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/50">
              <Building className="h-12 w-12 text-muted-foreground" />
            </div>
            <Button variant="outline" size="sm">Upload Logo</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
