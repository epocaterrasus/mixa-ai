import { useEngineStore } from "../stores/engine";
import type { EngineStatusCode } from "@mixa-ai/types";

const STATUS_COLORS: Record<EngineStatusCode, string> = {
  running: "#22c55e",
  starting: "#f59e0b",
  stopped: "#6b7280",
  error: "#ef4444",
};

const STATUS_LABELS: Record<EngineStatusCode, string> = {
  running: "Engine running",
  starting: "Engine starting...",
  stopped: "Engine stopped",
  error: "Engine error",
};

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "0 8px",
    height: "28px",
    borderRadius: "6px",
    fontSize: "11px",
    color: "#888",
    cursor: "default",
    flexShrink: 0,
  } as React.CSSProperties,
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  } as React.CSSProperties,
} as const;

export function EngineStatusIndicator(): React.ReactElement {
  const status = useEngineStore((s) => s.status);
  const version = useEngineStore((s) => s.version);

  const color = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];
  const tooltip = version ? `${label} (v${version})` : label;

  return (
    <div style={styles.container} title={tooltip} aria-label={tooltip}>
      <span
        style={{
          ...styles.dot,
          backgroundColor: color,
        }}
      />
      <span>Fenix</span>
    </div>
  );
}
