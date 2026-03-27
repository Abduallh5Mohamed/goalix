"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockPlayers, mockEvaluations } from "@/lib/mock-data";
import { Dumbbell, Target, Zap, Clock, Check } from "lucide-react";

export default function PlayerTrainingPage() {
  const player = mockPlayers.find((p) => p.id === "p1")!;
  const latestEval = mockEvaluations
    .filter((e) => e.playerId === "p1")
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  // Generate mock training plan based on evaluation
  const trainingPlan = [
    {
      id: 1,
      category: "Technical",
      focus: "Ball Control Drills",
      description: "Juggling, first touch exercises, and close control dribbling",
      duration: "30 min",
      frequency: "Every session",
      priority: "high",
      progress: 80,
    },
    {
      id: 2,
      category: "Tactical",
      focus: "Defensive Awareness",
      description: "Positional play exercises and tracking runs",
      duration: "20 min",
      frequency: "3x per week",
      priority: "medium",
      progress: 55,
    },
    {
      id: 3,
      category: "Physical",
      focus: "Speed & Agility",
      description: "Sprint drills, ladder exercises, and cone work",
      duration: "25 min",
      frequency: "2x per week",
      priority: "high",
      progress: 70,
    },
    {
      id: 4,
      category: "Mental",
      focus: "Leadership Development",
      description: "Team captain exercises, communication drills",
      duration: "15 min",
      frequency: "Weekly",
      priority: "medium",
      progress: 60,
    },
    {
      id: 5,
      category: "Physical",
      focus: "Endurance Training",
      description: "Long runs, interval training, and recovery protocols",
      duration: "40 min",
      frequency: "2x per week",
      priority: "low",
      progress: 90,
    },
  ];

  const weeklyGoals = [
    { text: "Complete 3 ball control sessions", done: true },
    { text: "Run 5km total in interval training", done: true },
    { text: "Practice free kicks (50 attempts)", done: false },
    { text: "Watch tactical analysis video", done: false },
    { text: "Attend all scheduled sessions", done: true },
  ];

  const priorityColors = {
    high: "border-red-500/30 text-red-400",
    medium: "border-amber-500/30 text-amber-400",
    low: "border-emerald-500/30 text-emerald-400",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Training Plan"
        description="Personalized training program"
        breadcrumbs={[
          { label: "Home", href: "/player/home" },
          { label: "Training" },
          { label: "My Plan" },
        ]}
      />

      {/* Weekly Goals */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Weekly Goals
            </CardTitle>
            <Badge variant="outline">
              {weeklyGoals.filter((g) => g.done).length}/{weeklyGoals.length} Done
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {weeklyGoals.map((goal, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-lg p-3 ${
                goal.done ? "bg-emerald-500/5" : "bg-muted/20"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  goal.done
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "border border-border/50 text-muted-foreground"
                }`}
              >
                {goal.done && <Check className="h-3.5 w-3.5" />}
              </div>
              <span
                className={`text-sm ${
                  goal.done
                    ? "text-muted-foreground line-through"
                    : "font-medium"
                }`}
              >
                {goal.text}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Training Plan Items */}
      <div className="space-y-4">
        {trainingPlan.map((item) => (
          <Card key={item.id} className="border-border/50 bg-card">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        priorityColors[item.priority as keyof typeof priorityColors]
                      }`}
                    >
                      {item.priority}
                    </Badge>
                  </div>
                  <h3 className="mb-1 text-lg font-semibold">{item.focus}</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {item.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" />
                      {item.frequency}
                    </span>
                  </div>
                </div>
                <div className="w-32 text-right">
                  <p className="mb-1 text-sm font-medium">{item.progress}%</p>
                  <Progress value={item.progress} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
