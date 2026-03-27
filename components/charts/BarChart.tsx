"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { cn } from "@/lib/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
    backgroundColor?: string | string[];
  }[];
  className?: string;
  height?: number;
  horizontal?: boolean;
}

export function BarChart({
  labels,
  datasets,
  className,
  height = 300,
  horizontal = false,
}: BarChartProps) {
  const data = {
    labels,
    datasets: datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.backgroundColor || `${ds.color || "#22d3ee"}cc`,
      hoverBackgroundColor: ds.color || "#22d3ee",
      borderRadius: 6,
      borderSkipped: false as const,
      barThickness: 24,
    })),
  };

  const options = {
    indexAxis: horizontal ? ("y" as const) : ("x" as const),
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: datasets.length > 1,
        position: "top" as const,
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
    scales: {
      x: {
        grid: { color: "#1e293b40", drawBorder: false },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
      y: {
        grid: { color: "#1e293b40", drawBorder: false },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
    },
  };

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  );
}
