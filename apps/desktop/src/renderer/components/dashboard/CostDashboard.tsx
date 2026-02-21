// Cost Dashboard — Rich web-rendered dashboard for the COST engine module
// Displays monthly spend, projected costs, budget utilization, provider breakdown,
// daily cost trends, and per-service breakdown table.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UIEvent } from "@mixa-ai/types";
import { MetricRow, Chart, Table } from "@mixa-ai/terminal-renderer";
import { useTabStore } from "../../stores/tabs";
import { useEngineStore } from "../../stores/engine";
import { useTerminalStream } from "../../hooks/useTerminalStream";
import {
  findComponent,
  findAlertComponents,
  parseBudgetAlerts,
  buildProviderPieComponent,
  getBudgetColor,
  type BudgetAlertData,
} from "./helpers";

// ─── Styles ─────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: "var(--mixa-bg-base)",
  color: "var(--mixa-text-primary)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  overflow: "auto",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 24px 12px",
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "var(--mixa-text-primary)",
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--mixa-text-muted)",
  margin: 0,
};

const actionsBarStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
};

const actionButtonStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-elevated)",
  color: "var(--mixa-text-primary)",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "background-color 150ms ease",
};

const contentStyle: React.CSSProperties = {
  padding: "0 24px 24px",
  flex: 1,
};

const chartGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
  marginBottom: "16px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--mixa-text-primary)",
  margin: "0 0 12px 0",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--mixa-bg-surface)",
  border: "1px solid var(--mixa-border-default)",
  borderRadius: "8px",
  padding: "16px",
};

const budgetBarContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginBottom: "16px",
};

const budgetRowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const budgetLabelRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "12px",
};

const budgetBarTrackStyle: React.CSSProperties = {
  height: "8px",
  borderRadius: "4px",
  backgroundColor: "var(--mixa-bg-elevated)",
  overflow: "hidden",
};

const centerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  gap: "12px",
};

const errorBoxStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  gap: "12px",
  padding: "24px",
};

const reconnectButtonStyle: React.CSSProperties = {
  padding: "6px 16px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-default)",
  backgroundColor: "var(--mixa-bg-elevated)",
  color: "var(--mixa-text-primary)",
  fontSize: "13px",
  cursor: "pointer",
};

const emptyStateStyle: React.CSSProperties = {
  ...cardStyle,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "48px 24px",
  textAlign: "center",
};

// ─── Budget editing modal/inline ────────────────────────────────

interface BudgetEditorProps {
  onSave: (scope: string, limit: string) => void;
  onCancel: () => void;
}

function BudgetEditor({ onSave, onCancel }: BudgetEditorProps): React.ReactElement {
  const [scope, setScope] = useState("total");
  const [limit, setLimit] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (limit && parseFloat(limit) > 0) {
        onSave(scope, limit);
      }
    },
    [scope, limit, onSave],
  );

  return (
    <div style={{ ...cardStyle, marginBottom: "16px" }}>
      <h3 style={sectionTitleStyle}>Set Budget Limit</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label
            htmlFor="budget-scope"
            style={{ display: "block", fontSize: "12px", color: "var(--mixa-text-muted)", marginBottom: "4px" }}
          >
            Scope
          </label>
          <select
            id="budget-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: "6px",
              border: "1px solid var(--mixa-border-default)",
              backgroundColor: "var(--mixa-bg-elevated)",
              color: "var(--mixa-text-primary)",
              fontSize: "13px",
            }}
          >
            <option value="total">Total (all providers)</option>
            <option value="provider:digitalocean">DigitalOcean</option>
            <option value="provider:aws">AWS</option>
            <option value="provider:manual">Manual</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label
            htmlFor="budget-limit"
            style={{ display: "block", fontSize: "12px", color: "var(--mixa-text-muted)", marginBottom: "4px" }}
          >
            Monthly Limit (USD)
          </label>
          <input
            id="budget-limit"
            type="number"
            step="0.01"
            min="0"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="e.g. 500.00"
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: "6px",
              border: "1px solid var(--mixa-border-default)",
              backgroundColor: "var(--mixa-bg-elevated)",
              color: "var(--mixa-text-primary)",
              fontSize: "13px",
              boxSizing: "border-box",
            }}
          />
        </div>
        <button type="submit" style={{ ...actionButtonStyle, backgroundColor: "var(--mixa-accent-primary)", color: "#fff" }}>
          Save
        </button>
        <button type="button" onClick={onCancel} style={actionButtonStyle}>
          Cancel
        </button>
      </form>
    </div>
  );
}

// ─── Budget utilization bars ────────────────────────────────────

function BudgetBars({ alerts }: { alerts: BudgetAlertData[] }): React.ReactElement {
  if (alerts.length === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>Budget Utilization</h3>
        <p style={{ fontSize: "13px", color: "var(--mixa-text-muted)", margin: 0 }}>
          No budgets configured. Click &quot;Set Budget&quot; to add one.
        </p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h3 style={sectionTitleStyle}>Budget Utilization</h3>
      <div style={budgetBarContainerStyle}>
        {alerts.map((alert) => (
          <div key={alert.scope} style={budgetRowStyle}>
            <div style={budgetLabelRowStyle}>
              <span style={{ fontWeight: 500, color: "var(--mixa-text-primary)" }}>{alert.scope}</span>
              <span style={{ color: "var(--mixa-text-muted)" }}>
                {alert.spent} / {alert.limit} ({Math.round(alert.utilization * 100)}%)
              </span>
            </div>
            <div style={budgetBarTrackStyle}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(alert.utilization * 100, 100)}%`,
                  backgroundColor: getBudgetColor(alert.level),
                  borderRadius: "4px",
                  transition: "width 300ms ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function CostDashboard(): React.ReactElement {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const updateTab = useTabStore((s) => s.updateTab);
  const engineConnected = useEngineStore((s) => s.connected);

  const [showBudgetEditor, setShowBudgetEditor] = useState(false);

  const streamId = activeTabId ? `cost-dash-${activeTabId}` : "cost-dash-default";
  const { view, state, error, sendEvent, reconnect } = useTerminalStream(streamId, "cost");

  // Update tab title
  useEffect(() => {
    if (activeTabId) {
      updateTab(activeTabId, { title: "Cost Dashboard" });
    }
  }, [activeTabId, updateTab]);

  // ─── Event handlers ──────────────────────────────────────

  const handleRefresh = useCallback(() => {
    sendEvent({
      module: "cost",
      actionId: "refresh",
      componentId: null,
      eventType: "click",
      data: {},
    });
  }, [sendEvent]);

  const handleExportCSV = useCallback(() => {
    sendEvent({
      module: "cost",
      actionId: "export-csv",
      componentId: null,
      eventType: "click",
      data: {},
    });
  }, [sendEvent]);

  const handleSetBudget = useCallback(
    (scope: string, limit: string) => {
      sendEvent({
        module: "cost",
        actionId: "set-budget",
        componentId: null,
        eventType: "click",
        data: { scope, limit },
      });
      setShowBudgetEditor(false);
    },
    [sendEvent],
  );

  const handleTableEvent = useCallback(
    (event: UIEvent) => {
      sendEvent(event);
    },
    [sendEvent],
  );

  const toggleBudgetEditor = useCallback(() => {
    setShowBudgetEditor((prev) => !prev);
  }, []);

  const hideBudgetEditor = useCallback(() => {
    setShowBudgetEditor(false);
  }, []);

  // ─── Extract data from UIView ────────────────────────────

  const metricsComponent = view ? findComponent(view, "cost-metrics") : null;
  const chartComponent = view ? findComponent(view, "cost-chart") : null;
  const tableComponent = view ? findComponent(view, "cost-breakdown-table") : null;
  const alertComponents = view ? findAlertComponents(view) : [];
  const budgetAlerts = useMemo(() => parseBudgetAlerts(alertComponents), [alertComponents]);

  const providerPieComponent = useMemo(() => {
    if (!tableComponent) return null;
    const rows = tableComponent.rows ?? [];
    if (rows.length === 0) return null;
    return buildProviderPieComponent(tableComponent);
  }, [tableComponent]);

  // ─── Month-over-month from metrics ───────────────────────

  const momData = useMemo(() => {
    if (!metricsComponent?.metrics) return null;
    const monthly = metricsComponent.metrics.find((m) => m.label === "Monthly Spend");
    if (!monthly) return null;
    return {
      value: monthly.value,
      trend: monthly.trend,
      changePercent: monthly.changePercent,
    };
  }, [metricsComponent]);

  // ─── Engine not connected ────────────────────────────────

  if (!engineConnected) {
    return (
      <div style={containerStyle}>
        <div style={centerStyle}>
          <div style={{ fontSize: "32px" }}>&#x26A0;&#xFE0F;</div>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>Engine Not Connected</div>
          <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>
            The Fenix engine is not running. Cost data is unavailable.
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading state ───────────────────────────────────────

  if (state === "connecting" || (state === "idle" && !view)) {
    return (
      <div style={containerStyle}>
        <div style={centerStyle}>
          <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>
            Loading cost data...
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────

  if (state === "error") {
    return (
      <div style={containerStyle}>
        <div style={errorBoxStyle}>
          <div style={{ fontSize: "32px" }}>&#x274C;</div>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>Connection Error</div>
          <div style={{ fontSize: "14px", color: "#ef4444", textAlign: "center", maxWidth: "400px" }}>
            {error}
          </div>
          <button type="button" onClick={reconnect} style={reconnectButtonStyle}>
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  // ─── Disconnected state ──────────────────────────────────

  if (state === "disconnected" && !view) {
    return (
      <div style={containerStyle}>
        <div style={errorBoxStyle}>
          <div style={{ fontSize: "32px" }}>&#x1F50C;</div>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>Disconnected</div>
          <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>
            Lost connection to the cost module.
          </div>
          <button type="button" onClick={reconnect} style={reconnectButtonStyle}>
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  // ─── Empty state (no data) ───────────────────────────────

  const hasData = (tableComponent?.rows?.length ?? 0) > 0 || (chartComponent?.chartData?.length ?? 0) > 0;

  if (view && !hasData) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Cost Dashboard</h1>
            <p style={subtitleStyle}>Cloud cost tracking &amp; budget management</p>
          </div>
          <div style={actionsBarStyle}>
            <button type="button" onClick={handleRefresh} style={actionButtonStyle}>
              Refresh
            </button>
          </div>
        </div>
        <div style={contentStyle}>
          {metricsComponent && <MetricRow component={metricsComponent} />}
          <div style={emptyStateStyle}>
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>&#x1F4B0;</div>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>No Cost Data Yet</div>
            <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)", maxWidth: "400px" }}>
              Add cost entries manually or configure a cloud provider (DigitalOcean, AWS) in the Terminal &gt; COST module to start tracking your spending.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Full dashboard render ───────────────────────────────

  return (
    <div style={containerStyle}>
      {/* Header with actions */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Cost Dashboard</h1>
          <p style={subtitleStyle}>
            Cloud cost tracking &amp; budget management
            {momData && momData.changePercent !== 0 && (
              <span
                style={{
                  marginLeft: "12px",
                  color: momData.trend === "up" ? "#ef4444" : momData.trend === "down" ? "#22c55e" : "var(--mixa-text-muted)",
                  fontWeight: 500,
                }}
              >
                {momData.trend === "up" ? "\u2191" : momData.trend === "down" ? "\u2193" : "\u2192"}
                {Math.abs(momData.changePercent).toFixed(1)}% vs last month
              </span>
            )}
          </p>
        </div>
        <div style={actionsBarStyle}>
          <button type="button" onClick={toggleBudgetEditor} style={actionButtonStyle}>
            Set Budget
          </button>
          <button type="button" onClick={handleExportCSV} style={actionButtonStyle}>
            Export CSV
          </button>
          <button type="button" onClick={handleRefresh} style={actionButtonStyle}>
            Refresh
          </button>
        </div>
      </div>

      <div style={contentStyle}>
        {/* Metrics row */}
        {metricsComponent && <MetricRow component={metricsComponent} />}

        {/* Budget editor (inline, toggled) */}
        {showBudgetEditor && (
          <BudgetEditor onSave={handleSetBudget} onCancel={hideBudgetEditor} />
        )}

        {/* Budget utilization bars */}
        {budgetAlerts.length > 0 && <BudgetBars alerts={budgetAlerts} />}

        {/* Charts grid: area chart + pie chart */}
        <div style={chartGridStyle}>
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Daily Cost Trend (30 days)</h3>
            {chartComponent && <Chart component={chartComponent} />}
          </div>
          {providerPieComponent && (
            <div style={cardStyle}>
              <h3 style={sectionTitleStyle}>Cost by Provider</h3>
              <Chart component={providerPieComponent} />
            </div>
          )}
        </div>

        {/* Service breakdown table */}
        {tableComponent && (
          <div style={{ marginBottom: "16px" }}>
            <h3 style={sectionTitleStyle}>Per-Service Breakdown</h3>
            <Table
              component={tableComponent}
              onEvent={handleTableEvent}
              module="cost"
            />
          </div>
        )}
      </div>
    </div>
  );
}
