"use client";

import { useEffect, useMemo, useState } from "react";
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
import api from "@/api/axios";
import { Radar as RadarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemberContributionRadarProps {
  teamId: string;
  className?: string;
}

interface MemberSliceData {
  member_id: string;
  member_name: string;
  slices_by_type: Record<string, number>;
  total_slices: number;
}

interface RadarRow {
  name: string;
  [memberId: string]: number | string;
}

export default function MemberContributionRadar({ teamId, className }: MemberContributionRadarProps) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch ALL approved contributions
  useEffect(() => {
    api
      .get<{ data: Contribution[]; meta: { total: number } }>(
        `/teams/${teamId}/contributions`,
        { params: { status: "APPROVED", per_page: 100 } }
      )
      .then((r) => {
        setContributions(r.data.data);
        setError(null);
      })
      .catch((err) => {
        console.error("[MemberContributionRadar] fetch failed:", err);
        setError("Gagal memuat data kontribusi");
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  // Aggregate: member × type → slices
  const memberData = useMemo<MemberSliceData[]>(() => {
    if (contributions.length === 0) return [];

    // Group by member
    const map: Record<string, { name: string; types: Record<string, number> }> = {};
    for (const c of contributions) {
      // member is a nested object from API: { id, user: { name }, ... }
      const memberId = c.member?.id;
      const memberName = c.member?.user?.name ?? "Unknown";
      if (!memberId) {
        console.warn("[MemberContributionRadar] contribution without member.id:", c.id);
        continue;
      }
      if (!map[memberId]) {
        map[memberId] = { name: memberName, types: {} };
      }
      map[memberId].types[c.type] = (map[memberId].types[c.type] ?? 0) + c.total_slices;
    }

    return Object.entries(map).map(([member_id, entry]) => {
      const total_slices = Object.values(entry.types).reduce((s, v) => s + v, 0);
      return {
        member_id,
        member_name: entry.name,
        slices_by_type: entry.types,
        total_slices,
      };
    });
  }, [contributions]);

  // Build chart data: 6 rows (types) × N columns (members)
  // Each row = one contribution type (axis position)
  // Each column beyond "category" = one member's slice count for that type
  const { chartData, config } = useMemo<{ chartData: RadarRow[]; config: ChartConfig }>(() => {
    const TYPES = CONTRIBUTION_TYPES;

    // config: one key per member
    const cfg: ChartConfig = {};
    for (const m of memberData) {
      cfg[m.member_id] = {
        label: m.member_name,
        colors: { light: [getColor(m.member_name)], dark: [getColor(m.member_name)] },
      };
    }

    // Chart rows: each row is a contribution type (axis on radar)
    // Use "name" as the field key so PolarAxis reads it correctly
    const rows: RadarRow[] = TYPES.map((type) => {
      const row: RadarRow = { name: type.label };
      for (const m of memberData) {
        row[m.member_id] = m.slices_by_type[type.value] ?? 0;
      }
      return row;
    });

    return { chartData: rows, config: cfg };
  }, [memberData]);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center rounded-xl border border-gray-800 bg-card p-6 min-h-[340px]", className)}>
        <span className="text-xs text-gray-500">Memuat radar...</span>
      </div>
    );
  }

  if (error || memberData.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-800 bg-card p-6 min-h-[340px]", className)}>
        <RadarIcon className="size-6 text-gray-600" />
        <p className="text-xs text-gray-500">
          {error ?? "Belum ada data kontribusi yang disetujui."}
        </p>
        {contributions.length > 0 && (
          <p className="text-xs text-gray-600">
            ({contributions.length} kontribusi ditemukan tapi belum ada yang berstatus APPROVED)
          </p>
        )}
      </div>
    );
  }

  // Need at least 2 members with data for a meaningful multi-polygon radar
  // Otherwise show message
  const membersWithData = memberData.filter((m) => m.total_slices > 0);
  if (membersWithData.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-800 bg-card p-6 min-h-[340px]", className)}>
        <RadarIcon className="size-6 text-gray-600" />
        <p className="text-xs text-gray-500">Belum ada data kontribusi.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-gray-800 bg-card p-4", className)}>
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Profile Kontribusi Anggota</h3>
          <p className="text-xs text-gray-500">
            {membersWithData.length} anggota · proporsi slices per tipe
          </p>
        </div>
      </div>

      <div className="h-[280px]">
        <EvilRadarChart
          data={chartData as Record<string, unknown>[]}
          config={config}
          className="h-full w-full"
          chartProps={{ margin: { top: 8, right: 20, bottom: 8, left: 20 } }}
        >
          <PolarAxis dataKey="name" tickFontSize={10} />
          {membersWithData.map((m) => (
            <Radar
              key={m.member_id}
              dataKey={m.member_id}
              variant="filled"
              isClickable={false}
              radarProps={{
                fill: getColor(m.member_name),
                fillOpacity: 0.35,
                stroke: getColor(m.member_name),
                strokeWidth: 2.5,
                activeDot: { r: 5, fill: getColor(m.member_name), stroke: "#fff", strokeWidth: 2 },
                dot: { r: 3, fill: getColor(m.member_name), strokeWidth: 0 },
              }}
            />
          ))}
          <Tooltip
            variant="frosted-glass"
            roundness="lg"
          />
          <Legend
            variant="horizontal-bar"
            align="center"
            verticalAlign="bottom"
          />
        </EvilRadarChart>
      </div>
    </div>
  );
}

// Consistent color per member name
const MEMBER_COLORS = [
  "#e07820", // orange (accent)
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

function getColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}