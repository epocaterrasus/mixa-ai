// @mixa-ai/terminal-renderer — MetricRow component
// Renders horizontal row of metric cards with trend indicators

import type { Metric, UIComponent } from "@mixa-ai/types";
import { token, spacing, typography, radii } from "../styles.js";

export interface MetricRowProps {
  component: UIComponent;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: spacing[3],
  flexWrap: "wrap",
  marginBottom: spacing[3],
};

const metricCardStyle: React.CSSProperties = {
  flex: "1 1 160px",
  minWidth: "160px",
  backgroundColor: token("bgSurface"),
  border: `1px solid ${token("borderDefault")}`,
  borderRadius: radii.lg,
  padding: spacing[4],
};

const labelStyle: React.CSSProperties = {
  fontSize: typography.fontSize.xs,
  fontWeight: typography.fontWeight.medium,
  color: token("textMuted"),
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  margin: 0,
  marginBottom: spacing[1],
  fontFamily: typography.fontFamily.sans,
};

const valueStyle: React.CSSProperties = {
  fontSize: typography.fontSize["2xl"],
  fontWeight: typography.fontWeight.bold,
  color: token("textPrimary"),
  margin: 0,
  fontFamily: typography.fontFamily.mono,
  lineHeight: typography.lineHeight.tight,
};

const trendContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing[1],
  marginTop: spacing[1],
  fontSize: typography.fontSize.xs,
  fontFamily: typography.fontFamily.sans,
};

function getTrendColor(trend: Metric["trend"]): string {
  switch (trend) {
    case "up":
      return token("accentGreen");
    case "down":
      return "#ef4444";
    case "flat":
      return token("textMuted");
  }
}

function getTrendArrow(trend: Metric["trend"]): string {
  switch (trend) {
    case "up":
      return "\u2191";
    case "down":
      return "\u2193";
    case "flat":
      return "\u2192";
  }
}

function MetricCard({ metric }: { metric: Metric }): React.JSX.Element {
  const trendColor = getTrendColor(metric.trend);

  return (
    <div style={metricCardStyle}>
      <p style={labelStyle}>{metric.label}</p>
      <p style={valueStyle}>{metric.value}</p>
      <div style={trendContainerStyle}>
        <span style={{ color: trendColor, fontWeight: typography.fontWeight.medium }}>
          {getTrendArrow(metric.trend)} {Math.abs(metric.changePercent).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export function MetricRow({ component }: MetricRowProps): React.JSX.Element {
  const metrics = component.metrics ?? [];

  return (
    <div id={component.id} style={rowStyle} role="group" aria-label="Metrics">
      {metrics.map((metric, idx) => (
        <MetricCard key={idx} metric={metric} />
      ))}
    </div>
  );
}
