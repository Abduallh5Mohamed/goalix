"use client";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { cn } from "@/lib/utils";

ChartJS.register(ArcElement, Tooltip, Legend);

interface DoughnutChartProps {
  labels: string[];
  data: number[];
  colors?: string[];
  className?: string;
  height?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

const defaultColors = [
  "#22d3ee",
  "#3ddc84",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#10b981",
];

export function DoughnutChart({
  labels,
  data,
  colors = defaultColors,
  className,
  height = 300,
  centerLabel,
  centerValue,
}: DoughnutChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors.slice(0, data.length).map((c) => `${c}cc`),
        hoverBackgroundColor: colors.slice(0, data.length),
        borderColor: "transparent",
        borderWidth: 0,
        spacing: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#94a3b8",
          font: { size: 12 },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: "#0d2036",
        titleColor: "#f8fafc",
        bodyColor: "#94a3b8",
        borderColor: "#1e293b",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
  };

  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      <Doughnut data={chartData} options={options} />
      {centerLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">
            {centerValue}
          </span>
          <span className="text-xs text-muted-foreground">{centerLabel}</span>
        </div>
      )}
    </div>
  );
}
