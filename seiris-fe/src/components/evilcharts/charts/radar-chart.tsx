"use client";

import {
  type ChartConfig,
  ChartContainer,
} from "@/components/evilcharts/ui/chart";
import { ChartLegend, ChartLegendContent, type ChartLegendVariant } from "@/components/evilcharts/ui/legend";
import {
  ChartTooltip,
  ChartTooltipContent,
  type TooltipRoundness,
  type TooltipVariant,
} from "@/components/evilcharts/ui/tooltip";
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Radar as RechartsRadar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis as RechartsPolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

type RadarChartContextValue = {
  config: ChartConfig;
  selectedItem: string | null;
  selectItem: (itemName: string | null) => void;
};

const RadarChartContext = createContext<RadarChartContextValue | null>(null);

function useRadarChart() {
  const context = use(RadarChartContext);
  if (!context) {
    throw new Error(
      "Radar chart parts (<Radar />, <Tooltip />, …) must be used within <EvilRadarChart />",
    );
  }
  return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root container
// ─────────────────────────────────────────────────────────────────────────────

type EvilRadarChartProps = {
  config: ChartConfig;
  data: Record<string, unknown>[];
  children: ReactNode;
  className?: string;
  chartProps?: ComponentProps<typeof RechartsRadarChart>;
  defaultSelectedItem?: string | null;
  onSelectionChange?: (selection: string | null) => void;
};

export function EvilRadarChart({
  config,
  data,
  children,
  className,
  chartProps,
  defaultSelectedItem = null,
  onSelectionChange,
}: EvilRadarChartProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(defaultSelectedItem);

  const selectItem = useCallback(
    (itemName: string | null) => {
      setSelectedItem(itemName);
      onSelectionChange?.(itemName);
    },
    [onSelectionChange],
  );

  const contextValue = useMemo<RadarChartContextValue>(
    () => ({ config, selectedItem, selectItem }),
    [config, selectedItem, selectItem],
  );

  return (
    <RadarChartContext value={contextValue}>
      <ChartContainer className={className} config={config}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart
            data={data}
            accessibilityLayer
            {...chartProps}
          >
            {/* Subtle grid lines for dark bg */}
            <PolarGrid
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3 3"
            />
            {children}
          </RechartsRadarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </RadarChartContext>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composable parts
// ─────────────────────────────────────────────────────────────────────────────

type RadarProps = {
  dataKey: string;
  variant?: "filled" | "outline";
  isClickable?: boolean;
  radarProps?: Record<string, unknown>;
};

export function Radar({ dataKey, variant = "filled", isClickable = false, radarProps }: RadarProps) {
  const { config, selectItem, selectedItem } = useRadarChart();
  const configEntry = config[dataKey];
  const colors = configEntry?.colors?.light ?? ["#888"];
  const fill = variant === "filled" ? colors[0] : "transparent";
  const stroke = colors[0];

  const handleClick = useCallback(
    () => {
      if (!isClickable) return;
      selectItem(selectedItem === dataKey ? null : dataKey);
    },
    [isClickable, selectItem, selectedItem, dataKey],
  );

  return (
    <RechartsRadar
      dataKey={dataKey}
      stroke={stroke}
      fill={fill}
      fillOpacity={variant === "filled" ? 0.25 : 0}
      strokeWidth={2}
      isAnimationActive
      animationBegin={0}
      animationDuration={600}
      style={{ cursor: isClickable ? "pointer" : undefined }}
      onClick={isClickable ? handleClick : undefined}
      dot={{ r: 3, fill: colors[0], strokeWidth: 0 }}
      activeDot={{ r: 5, fill: colors[0], strokeWidth: 2, stroke: "#fff" }}
      {...(radarProps ?? {})}
    />
  );
}

type PolarAxisProps = {
  dataKey?: string;
  tickFontSize?: number;
};

export function PolarAxis({ dataKey = "category", tickFontSize = 11 }: PolarAxisProps) {
  return (
    <RechartsPolarAngleAxis
      dataKey={dataKey}
      tick={{ fontSize: tickFontSize, fill: "rgba(255,255,255,0.45)" }}
      tickLine={false}
      axisLine={false}
    />
  );
}

type TooltipProps = {
  variant?: TooltipVariant;
  roundness?: TooltipRoundness;
};

export function Tooltip({ variant, roundness }: TooltipProps) {
  return (
    <ChartTooltip
      content={
        <ChartTooltipContent
          nameKey="category"
          hideLabel
          roundness={roundness}
          variant={variant}
        />
      }
    />
  );
}

type LegendProps = {
  variant?: ChartLegendVariant;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  isClickable?: boolean;
};

export function Legend({
  variant = "rounded-square",
  align = "center",
  verticalAlign = "bottom",
  isClickable = false,
}: LegendProps) {
  const { selectedItem, selectItem } = useRadarChart();

  return (
    <ChartLegend
      verticalAlign={verticalAlign}
      align={align}
      content={
        <ChartLegendContent
          selected={selectedItem}
          onSelectChange={selectItem}
          isClickable={isClickable}
          variant={variant}
        />
      }
    />
  );
}