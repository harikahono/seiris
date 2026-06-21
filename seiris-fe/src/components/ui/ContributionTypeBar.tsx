import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { Contribution } from "@/types";

const TYPE_META: Record<string, { label: string; color: string }> = {
  TIME:     { label: "Time",     color: "#60a5fa" },
  CASH:     { label: "Cash",     color: "#4ade80" },
  IDEA:     { label: "Idea",     color: "#fbbf24" },
  NETWORK:  { label: "Network",  color: "#a78bfa" },
  FACILITY: { label: "Facility", color: "#fb923c" },
  REVENUE:  { label: "Revenue",  color: "#22d3ee" },
};

const TYPE_ORDER = ["CASH", "TIME", "IDEA", "NETWORK", "FACILITY", "REVENUE"];

interface ContributionTypeBarProps {
  contributions: Contribution[];
}

export default function ContributionTypeBar({ contributions }: ContributionTypeBarProps) {
  const data = useMemo(() => {
    const approved = contributions.filter((c) => c.status === "APPROVED");
    if (approved.length === 0) return [];

    const grouped: Record<string, { type: string; label: string; color: string; slices: number }> = {};

    for (const c of approved) {
      const meta = TYPE_META[c.type] ?? { label: c.type, color: "#6b7280" };
      if (!grouped[c.type]) {
        grouped[c.type] = { type: c.type, label: meta.label, color: meta.color, slices: 0 };
      }
      grouped[c.type].slices += c.total_slices;
    }

    const total = Object.values(grouped).reduce((sum, g) => sum + g.slices, 0);

    return TYPE_ORDER
      .filter((t) => grouped[t])
      .map((t) => ({
        ...grouped[t],
        pct: total > 0 ? Math.round((grouped[t].slices / total) * 100) : 0,
      }))
      .sort((a, b) => b.slices - a.slices);
  }, [contributions]);

  if (data.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-gray-800 bg-gray-900 p-6">
        <p className="text-sm text-gray-500">Belum ada data kontribusi.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h3 className="mb-4 text-sm font-semibold text-white">Kontribusi per Tipe</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
          >
            <XAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={80}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: 8,
                fontSize: 12,
                color: "#e5e7eb",
              }}
              formatter={(value) => [`${value}%`, "Persentase"] as [string, string]}
            />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {data.map((entry) => (
                <Cell key={entry.type} fill={entry.color} />
              ))}
              <LabelList
                dataKey="pct"
                position="right"
                formatter={(v: unknown) => `${v}%`}
                fill="#9ca3af"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
