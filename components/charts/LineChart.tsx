"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { cn } from "@/lib/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface LineChartProps {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
    fill?: boolean;
    borderColor?: string;
    backgroundColor?: string;
  }[];
  className?: string;
  height?: number;
}

export function LineChart({
  labels,
  datasets,
  className,
  height = 300,
}: LineChartProps) {
  const data = {
    labels,
    datasets: datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.borderColor || ds.color || "#22d3ee",
      backgroundColor: ds.backgroundColor || (ds.fill
        ? `${ds.color || "#22d3ee"}20`
        : "transparent"),
      fill: ds.fill || false,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: ds.color || "#22d3ee",
      pointBorderColor: "transparent",
      borderWidth: 2,
    })),
  };

  const options = {
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
      <Line data={data} options={options} />
    </div>
  );
}
