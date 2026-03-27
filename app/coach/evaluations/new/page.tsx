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
import { mockGroups, mockPlayers } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";
import { Save, CheckCircle2, Star } from "lucide-react";

interface EvalScores {
  technical: string;
  tactical: string;
  physical: string;
  mental: string;
  notes: string;
}

export default function CoachNewEvaluationPage() {
  const myGroups = mockGroups.filter((g) => ["g1", "g3"].includes(g.id));
  const [selectedGroup, setSelectedGroup] = useState(myGroups[0]?.id || "");
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [saved, setSaved] = useState(false);
  const [scores, setScores] = useState<EvalScores>({
    technical: "",
    tactical: "",
    physical: "",
    mental: "",
    notes: "",
  });

  const players = mockPlayers.filter((p) => p.groupId === selectedGroup);

  const overall =
    scores.technical && scores.tactical && scores.physical && scores.mental
      ? (
          (parseFloat(scores.technical) +
            parseFloat(scores.tactical) +
            parseFloat(scores.physical) +
            parseFloat(scores.mental)) /
          4
        ).toFixed(1)
      : "—";

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setScores({
        technical: "",
        tactical: "",
        physical: "",
        mental: "",
        notes: "",
      });
      setSelectedPlayer("");
    }, 2000);
  };

  const categories = [
    { key: "technical", label: "Technical", emoji: "⚽" },
    { key: "tactical", label: "Tactical", emoji: "🧠" },
    { key: "physical", label: "Physical", emoji: "💪" },
    { key: "mental", label: "Mental", emoji: "🎯" },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Evaluation"
        description="Create a player evaluation"
        breadcrumbs={[
          { label: "Home", href: "/coach/home" },
          { label: "Evaluations" },
          { label: "New" },
        ]}
      />

      {/* Selectors */}
      <div className="flex flex-wrap gap-4">
        <div className="w-64">
          <Label className="mb-2 block text-sm">Group</Label>
          <Select
            value={selectedGroup}
            onValueChange={(v) => {
              setSelectedGroup(v);
              setSelectedPlayer("");
            }}
          >
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
        <div className="w-64">
          <Label className="mb-2 block text-sm">Player</Label>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger>
              <SelectValue placeholder="Select player" />
            </SelectTrigger>
            <SelectContent>
              {players.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedPlayer && (
        <>
          {/* Player Info */}
          {(() => {
            const player = players.find((p) => p.id === selectedPlayer);
            if (!player) return null;
            return (
              <Card className="border-border/50 bg-card">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {getInitials(player.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {player.fullName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {player.position} · Age {player.age} · Level{" "}
                      {player.level}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm text-muted-foreground">
                      Current Score
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {player.performanceScore}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Score Inputs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => (
              <Card key={cat.key} className="border-border/50 bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <span>{cat.emoji}</span>
                    {cat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="0.0 - 10.0"
                    value={scores[cat.key]}
                    onChange={(e) =>
                      setScores((prev) => ({
                        ...prev,
                        [cat.key]: e.target.value,
                      }))
                    }
                    className="text-center text-2xl font-bold"
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Overall Score */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Overall Score
                  </p>
                  <p className="text-3xl font-bold text-primary">{overall}</p>
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                Average of all 4 categories
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Coach Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="min-h-[120px] w-full rounded-lg border border-border/30 bg-muted/20 p-3 text-sm focus:border-primary/50 focus:outline-none"
                placeholder="Write detailed observations about the player's performance..."
                value={scores.notes}
                onChange={(e) =>
                  setScores((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleSave}
              disabled={
                !scores.technical ||
                !scores.tactical ||
                !scores.physical ||
                !scores.mental
              }
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
                  Submit Evaluation
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
