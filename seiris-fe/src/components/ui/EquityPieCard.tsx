import { useMemo } from "react";
import { EvilPieChart, Pie, Tooltip, Legend } from "@/components/evilcharts/charts/pie-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/chart";
import type { EquityMemberEntry } from "@/types";

const PALETTE = [
  "#e07820", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
  "#ec4899", "#14b8a6", "#f43f5e", "#6366f1", "#84cc16",
  "#d946ef", "#06b6d4", "#f97316", "#a855f7", "#22c55e",
];

interface EquityPieCardProps {
  members: EquityMemberEntry[];
  totalSlices: number;
  isFrozen: boolean;
}

export default function EquityPieCard({ members, totalSlices, isFrozen }: EquityPieCardProps) {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    members.forEach((m, i) => {
      config[m.member_id] = {
        label: m.name,
        colors: {
          light: [PALETTE[i % PALETTE.length]],
          dark: [PALETTE[i % PALETTE.length]],
        },
      };
    });
    return config;
  }, [members]);

  if (members.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-gray-800 bg-card p-6">
        <p className="text-sm text-gray-500">Belum ada data equity.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-card p-5 h-full">
      <h3 className="mb-1 text-sm font-semibold text-white" title="Equity = hak kepemilikan atas nilai tim, dihitung dari total slices">Equity per Anggota</h3>
      <p className="mb-4 text-xs text-gray-500" title="Unit equity dalam metode Slicing Pie — total hak kepemilikan tim">
        Total Slices: {totalSlices.toLocaleString("id-ID")}
        {isFrozen && <span className="ml-2 text-red-400">(Frozen)</span>}
      </p>
      <EvilPieChart
        className="h-[280px] w-full"
        data={members as unknown as Record<string, unknown>[] /* ponytail: no index sig on EquityMemberEntry */}
        dataKey="equity_pct"
        nameKey="member_id"
        config={chartConfig}
      >
        <Legend isClickable variant="circle" />
        <Tooltip
          variant="frosted-glass"
          roundness="lg"
        />
        <Pie
          isClickable
          innerRadius={50}
          paddingAngle={3}
          cornerRadius={6}
        />
      </EvilPieChart>
    </div>
  );
}
