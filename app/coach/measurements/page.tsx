"use client";

import { useState } from "react";
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
import { mockGroups, mockPlayers, mockMeasurements } from "@/lib/mock-data";
import { getInitials, formatDate } from "@/lib/utils";
import { Save, CheckCircle2, Ruler, TrendingUp } from "lucide-react";

export default function CoachMeasurementsPage() {
  const myGroups = mockGroups.filter((g) => ["g1", "g3"].includes(g.id));
  const [selectedGroup, setSelectedGroup] = useState(myGroups[0]?.id || "");
  const [saved, setSaved] = useState(false);
  const players = mockPlayers.filter((p) => p.groupId === selectedGroup);

  const [measurements, setMeasurements] = useState<
    Record<
      string,
      {
        height: string;
        weight: string;
        sprintSpeed: string;
        endurance: string;
        flexibility: string;
      }
    >
  >({});

  const handleChange = (
    playerId: string,
    field: string,
    value: string
  ) => {
    setMeasurements((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: value },
    }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const fields = [
    { key: "height", label: "Height (cm)", placeholder: "152" },
    { key: "weight", label: "Weight (kg)", placeholder: "42" },
    { key: "sprintSpeed", label: "Sprint (s)", placeholder: "7.0" },
    { key: "endurance", label: "Endurance", placeholder: "8.5" },
    { key: "flexibility", label: "Flexibility", placeholder: "7.5" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Player Measurements"
        description="Record monthly physical measurements"
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Measurements" },
        ]}
      />

      {/* Group Selector */}
      <div className="w-64">
        <Label className="mb-2 block text-sm">Group</Label>
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger>
            <SelectValue placeholder="Select group" />
          </SelectTrigger>
          <SelectContent>
            {myGroups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Player Measurement Cards */}
      <div className="space-y-4">
        {players.map((player) => {
          const lastMeasurement = mockMeasurements
            .filter((m) => m.playerId === player.id)
            .sort((a, b) => b.date.localeCompare(a.date))[0];

          return (
            <Card key={player.id} className="border-border/50 bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
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
                        {player.position} · Age {player.age}
                      </p>
                    </div>
                  </div>
                  {lastMeasurement && (
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Last: {formatDate(lastMeasurement.date)}</p>
                      <p>
                        {lastMeasurement.height}cm /{" "}
                        {lastMeasurement.weight}kg
                      </p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <Label className="mb-1 block text-[10px] text-muted-foreground">
                        {field.label}
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder={field.placeholder}
                        value={
                          measurements[player.id]?.[
                            field.key as keyof (typeof measurements)[string]
                          ] || ""
                        }
                        onChange={(e) =>
                          handleChange(player.id, field.key, e.target.value)
                        }
                        className="text-center"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save */}
      <div className="sticky bottom-4 flex justify-end">
        <Button
          size="lg"
          onClick={handleSave}
          className={saved ? "bg-emerald-600 hover:bg-emerald-700" : ""}
        >
          {saved ? (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Save Measurements
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
