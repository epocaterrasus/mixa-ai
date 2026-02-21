// @mixa-ai/terminal-renderer — Chart component
// Renders area/bar/line/pie charts using recharts

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UIComponent } from "@mixa-ai/types";
import { token, spacing, radii, typography } from "../styles.js";

export interface ChartProps {
  component: UIComponent;
}

const CHART_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#f97316",
  "#14b8a6",
];

const chartContainerStyle: React.CSSProperties = {
  backgroundColor: token("bgSurface"),
  border: `1px solid ${token("borderDefault")}`,
  borderRadius: radii.lg,
  padding: spacing[4],
  marginBottom: spacing[3],
};

interface ParsedRow {
  [key: string]: string | number;
}

function parseChartData(
  rawData: ReadonlyArray<{ values: Record<string, string> }>,
): { data: ParsedRow[]; seriesKeys: string[]; xKey: string } {
  if (rawData.length === 0) {
    return { data: [], seriesKeys: [], xKey: "" };
  }

  const keys = Object.keys(rawData[0]?.values ?? {});
  const xKey = keys[0] ?? "";
  const seriesKeys = keys.slice(1);

  const data: ParsedRow[] = rawData.map((point) => {
    const row: ParsedRow = {};
    for (const key of keys) {
      const val = point.values[key] ?? "";
      const num = Number(val);
      row[key] = isNaN(num) ? val : num;
    }
    return row;
  });

  return { data, seriesKeys, xKey };
}

function AreaChartView({
  data,
  xKey,
  seriesKeys,
}: {
  data: ParsedRow[];
  xKey: string;
  seriesKeys: string[];
}): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--mixa-border-subtle)" />
        <XAxis
          dataKey={xKey}
          stroke="var(--mixa-text-muted)"
          fontSize={11}
          fontFamily={typography.fontFamily.sans}
        />
        <YAxis
          stroke="var(--mixa-text-muted)"
          fontSize={11}
          fontFamily={typography.fontFamily.sans}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--mixa-bg-elevated)",
            border: "1px solid var(--mixa-border-default)",
            borderRadius: "6px",
            color: "var(--mixa-text-primary)",
            fontSize: "12px",
          }}
        />
        <Legend />
        {seriesKeys.map((key, idx) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
            fill={CHART_COLORS[idx % CHART_COLORS.length]}
            fillOpacity={0.15}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function BarChartView({
  data,
  xKey,
  seriesKeys,
}: {
  data: ParsedRow[];
  xKey: string;
  seriesKeys: string[];
}): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--mixa-border-subtle)" />
        <XAxis
          dataKey={xKey}
          stroke="var(--mixa-text-muted)"
          fontSize={11}
          fontFamily={typography.fontFamily.sans}
        />
        <YAxis
          stroke="var(--mixa-text-muted)"
          fontSize={11}
          fontFamily={typography.fontFamily.sans}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--mixa-bg-elevated)",
            border: "1px solid var(--mixa-border-default)",
            borderRadius: "6px",
            color: "var(--mixa-text-primary)",
            fontSize: "12px",
          }}
        />
        <Legend />
        {seriesKeys.map((key, idx) => (
          <Bar key={key} dataKey={key} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartView({
  data,
  xKey,
  seriesKeys,
}: {
  data: ParsedRow[];
  xKey: string;
  seriesKeys: string[];
}): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--mixa-border-subtle)" />
        <XAxis
          dataKey={xKey}
          stroke="var(--mixa-text-muted)"
          fontSize={11}
          fontFamily={typography.fontFamily.sans}
        />
        <YAxis
          stroke="var(--mixa-text-muted)"
          fontSize={11}
          fontFamily={typography.fontFamily.sans}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--mixa-bg-elevated)",
            border: "1px solid var(--mixa-border-default)",
            borderRadius: "6px",
            color: "var(--mixa-text-primary)",
            fontSize: "12px",
          }}
        />
        <Legend />
        {seriesKeys.map((key, idx) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartView({ data, xKey }: { data: ParsedRow[]; xKey: string }): React.JSX.Element {
  // For pie charts, use xKey as label and the first numeric series as value
  const valueKey = Object.keys(data[0] ?? {}).find((k) => k !== xKey && typeof data[0]?.[k] === "number") ?? "";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--mixa-bg-elevated)",
            border: "1px solid var(--mixa-border-default)",
            borderRadius: "6px",
            color: "var(--mixa-text-primary)",
            fontSize: "12px",
          }}
        />
        <Legend />
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={xKey}
          cx="50%"
          cy="50%"
          outerRadius={100}
          label
        >
          {data.map((_entry, idx) => (
            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Chart({ component }: ChartProps): React.JSX.Element {
  const chartType = component.chartType ?? "line";
  const rawData = component.chartData ?? [];

  const { data, seriesKeys, xKey } = useMemo(() => parseChartData(rawData), [rawData]);

  if (data.length === 0) {
    return (
      <div id={component.id} style={chartContainerStyle}>
        <p style={{ color: token("textMuted"), textAlign: "center", margin: 0 }}>No chart data</p>
      </div>
    );
  }

  return (
    <div id={component.id} style={chartContainerStyle}>
      {chartType === "area" && <AreaChartView data={data} xKey={xKey} seriesKeys={seriesKeys} />}
      {chartType === "bar" && <BarChartView data={data} xKey={xKey} seriesKeys={seriesKeys} />}
      {chartType === "line" && <LineChartView data={data} xKey={xKey} seriesKeys={seriesKeys} />}
      {chartType === "pie" && <PieChartView data={data} xKey={xKey} />}
    </div>
  );
}
