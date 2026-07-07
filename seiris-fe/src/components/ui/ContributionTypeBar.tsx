import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  LabelList,
} from "recharts";
import { CONTRIBUTION_TYPES } from "@/lib/contribution";
import { ChartContainer, type ChartConfig } from "@/components/evilcharts/ui/chart";
import { ChartTooltip, ChartTooltipContent } from "@/components/evilcharts/ui/tooltip";

const TYPE_ORDER = ["CASH", "TIME", "IDEA", "NETWORK", "FACILITY", "SALES"];

// ponytail: derive from shared CONTRIBUTION_TYPES
const TYPE_META: Record<string, { label: string; color: string }> =
  Object.fromEntries(
    CONTRIBUTION_TYPES.map((t) => [t.value, { label: t.label, color: t.color }])
  );

// ponytail: build ChartConfig for evilcharts context (same pattern as EquityPieCard)
const chartConfig: ChartConfig = {};
TYPE_ORDER.forEach((t) => {
  const meta = TYPE_META[t];
  if (meta) {
    chartConfig[t] = {
      label: meta.label,
      colors: { light: [meta.color], dark: [meta.color] },
    };
  }
});

interface ContributionTypeBarProps {
  slices_by_type: Record<string, number>;
}

export default function ContributionTypeBar({ slices_by_type }: ContributionTypeBarProps) {
  const data = useMemo(() => {
    const total = Object.values(slices_by_type).reduce((s, v) => s + v, 0);
    if (total === 0) return [];

    return TYPE_ORDER
      .filter((t) => (slices_by_type[t] ?? 0) > 0)
      .map((t) => {
        const meta = TYPE_META[t] ?? { label: t, color: "#6b7280" };
        return {
          type: t,
          label: meta.label,
          color: meta.color,
          slices: slices_by_type[t],
          pct: Math.round((slices_by_type[t] / total) * 100),
        };
      })
      .sort((a, b) => b.slices - a.slices);
  }, [slices_by_type]);

  if (data.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-gray-800 bg-card p-6">
        <p className="text-sm text-gray-500">Belum ada data kontribusi.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-white">Kontribusi per Tipe</h3>
      <ChartContainer config={chartConfig} className="h-[250px]">
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
          <ChartTooltip
            content={
              <ChartTooltipContent
                variant="frosted-glass"
                roundness="lg"
                hideIndicator
                hideLabel
                formatter={(value, _name, item) => (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-white">
                      {item.payload.label} {value}%
                    </span>
                    <span className="text-gray-400">
                      Total Slice: {item.payload.slices.toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
              />
            }
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
      </ChartContainer>
    </div>
  );
}
