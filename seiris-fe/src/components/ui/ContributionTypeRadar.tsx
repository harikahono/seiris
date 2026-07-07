"use client";

import { useMemo } from "react";
import {
  EvilRadarChart,
  Radar,
  PolarAxis,
  Tooltip,
  Legend,
} from "@/components/evilcharts/charts/radar-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/chart";
import type { Contribution } from "@/types";
import { CONTRIBUTION_TYPES } from "@/lib/contribution";
import { BarChart3 } from "lucide-react";

interface ContributionTypeRadarProps {
  contributions: Contribution[];
  className?: string;
}

export default function ContributionTypeRadar({ contributions, className }: ContributionTypeRadarProps) {
  const { data, config } = useMemo(() => {
    // Only approved contributions count toward equity
    const approved = contributions.filter((c) => c.status === "APPROVED");
    if (approved.length === 0) {
      return { data: [], config: {} as ChartConfig };
    }

    // Group by type and sum slices
    const grouped: Record<string, number> = {};
    for (const c of approved) {
      grouped[c.type] = (grouped[c.type] ?? 0) + c.total_slices;
    }

    const total = Object.values(grouped).reduce((sum, v) => sum + v, 0);

    // Build data array — each type becomes a dataKey with its slices as value
    const chartData = Object.entries(grouped).map(([type, slices]) => {
      const typeDef = CONTRIBUTION_TYPES.find((t) => t.value === type);
      return {
        category: typeDef?.label ?? type,
        [type]: slices,
        percent: total > 0 ? Math.round((slices / total) * 100) : 0,
      };
    });

    // Build config with colors from CONTRIBUTION_TYPES
    const cfg: ChartConfig = {};
    for (const typeDef of CONTRIBUTION_TYPES) {
      if (grouped[typeDef.value] !== undefined) {
        cfg[typeDef.value] = {
          label: typeDef.label,
          colors: {
            light: [typeDef.color],
            dark: [typeDef.color],
          },
        };
      }
    }

    return { data: chartData, config: cfg };
  }, [contributions]);

  if (data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-800 bg-card p-6 ${className ?? ""}`}>
        <BarChart3 className="size-6 text-gray-600" />
        <p className="text-xs text-gray-500">Belum ada data kontribusi.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-gray-800 bg-card p-4 ${className ?? ""}`}>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Kontribusi per Tipe</h3>
        <span className="text-xs text-gray-500">
          {data.length} tipe · {contributions.filter((c) => c.status === "APPROVED").length} disetujui
        </span>
      </div>
      <div className="h-[220px]">
        <EvilRadarChart
          data={data as Record<string, unknown>[]}
          config={config}
          className="h-full w-full"
          chartProps={{ margin: { top: 8, right: 16, bottom: 8, left: 16 } }}
        >
          <PolarAxis dataKey="category" tickFontSize={10} />
          {Object.keys(config).map((typeKey) => (
            <Radar
              key={typeKey}
              dataKey={typeKey}
              variant="filled"
              isClickable={false}
            />
          ))}
          <Tooltip variant="frosted-glass" roundness="lg" />
          <Legend variant="horizontal-bar" align="center" />
        </EvilRadarChart>
      </div>
    </div>
  );
}