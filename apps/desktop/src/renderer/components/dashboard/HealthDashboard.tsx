// Health Dashboard — Rich web-rendered dashboard for the PULSE engine module
// Displays endpoint uptime, response time charts, SSL certificate expiry,
// incident timeline, and endpoint management.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UIEvent } from "@mixa-ai/types";
import { MetricRow, Chart, Table } from "@mixa-ai/terminal-renderer";
import { useTabStore } from "../../stores/tabs";
import { useEngineStore } from "../../stores/engine";
import { useTerminalStream } from "../../hooks/useTerminalStream";
import {
  findComponent,
  parseUptimeRows,
  parseSSLRows,
  parseIncidents,
  getStatusColor,
  getSSLAlertColor,
  getStatusLabel,
  calculateHealthScore,
} from "./health-helpers";

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

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "2px 8px",
  borderRadius: "9999px",
  fontSize: "11px",
  fontWeight: 600,
};

const sslBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "9999px",
  fontSize: "11px",
  fontWeight: 600,
};

const incidentItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  padding: "8px 0",
  borderBottom: "1px solid var(--mixa-border-default)",
  fontSize: "13px",
};

const addEndpointFormStyle: React.CSSProperties = {
  ...cardStyle,
  marginBottom: "16px",
};

// ─── Uptime Grid ────────────────────────────────────────────────

function UptimeGrid({
  rows,
  onTestNow,
  onRemove,
  onCheckSSL,
}: {
  rows: ReturnType<typeof parseUptimeRows>;
  onTestNow: (id: string) => void;
  onRemove: (id: string) => void;
  onCheckSSL: (id: string) => void;
}): React.ReactElement {
  if (rows.length === 0) {
    return <div />;
  }

  return (
    <div style={{ ...cardStyle, marginBottom: "16px" }}>
      <h3 style={sectionTitleStyle}>Endpoint Status</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: "6px",
              backgroundColor: "var(--mixa-bg-elevated)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: getStatusColor(row.status),
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "13px" }}>{row.name}</div>
                <div style={{ fontSize: "11px", color: "var(--mixa-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.url}
                </div>
              </div>
              <span style={{ ...statusBadgeStyle, backgroundColor: `${getStatusColor(row.status)}20`, color: getStatusColor(row.status) }}>
                {getStatusLabel(row.status)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginLeft: "16px", fontSize: "12px", color: "var(--mixa-text-muted)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 600, color: "var(--mixa-text-primary)" }}>{row.uptime24h}</div>
                <div style={{ fontSize: "10px" }}>24h</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 600, color: "var(--mixa-text-primary)" }}>{row.uptime7d}</div>
                <div style={{ fontSize: "10px" }}>7d</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 600, color: "var(--mixa-text-primary)" }}>{row.uptime30d}</div>
                <div style={{ fontSize: "10px" }}>30d</div>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => onTestNow(row.id)}
                  style={{ ...actionButtonStyle, padding: "3px 8px", fontSize: "11px" }}
                  title="Test this endpoint now"
                >
                  Test
                </button>
                <button
                  type="button"
                  onClick={() => onCheckSSL(row.id)}
                  style={{ ...actionButtonStyle, padding: "3px 8px", fontSize: "11px" }}
                  title="Check SSL certificate"
                >
                  SSL
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(row.id)}
                  style={{ ...actionButtonStyle, padding: "3px 8px", fontSize: "11px", color: "#ef4444" }}
                  title="Remove this endpoint"
                >
                  &#x2715;
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SSL Expiry Table ──────────────────────────────────────────

function SSLExpirySection({
  rows,
}: {
  rows: ReturnType<typeof parseSSLRows>;
}): React.ReactElement {
  if (rows.length === 0) {
    return <div />;
  }

  return (
    <div style={{ ...cardStyle, marginBottom: "16px" }}>
      <h3 style={sectionTitleStyle}>SSL Certificate Expiry</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid var(--mixa-border-default)", fontSize: "11px", color: "var(--mixa-text-muted)", fontWeight: 600 }}>Endpoint</th>
              <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid var(--mixa-border-default)", fontSize: "11px", color: "var(--mixa-text-muted)", fontWeight: 600 }}>Issuer</th>
              <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid var(--mixa-border-default)", fontSize: "11px", color: "var(--mixa-text-muted)", fontWeight: 600 }}>Expires</th>
              <th style={{ textAlign: "center", padding: "8px", borderBottom: "1px solid var(--mixa-border-default)", fontSize: "11px", color: "var(--mixa-text-muted)", fontWeight: 600 }}>Days Left</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.name}-${i}`}>
                <td style={{ padding: "8px", borderBottom: "1px solid var(--mixa-border-default)" }}>{row.name}</td>
                <td style={{ padding: "8px", borderBottom: "1px solid var(--mixa-border-default)", color: "var(--mixa-text-muted)" }}>{row.issuer}</td>
                <td style={{ padding: "8px", borderBottom: "1px solid var(--mixa-border-default)", color: "var(--mixa-text-muted)" }}>
                  {row.expires ? new Date(row.expires).toLocaleDateString() : "—"}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid var(--mixa-border-default)", textAlign: "center" }}>
                  <span style={{ ...sslBadgeStyle, backgroundColor: `${getSSLAlertColor(row.alertLevel)}20`, color: getSSLAlertColor(row.alertLevel) }}>
                    {row.daysLeft}d
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Incident Timeline ─────────────────────────────────────────

function IncidentTimeline({
  incidents,
}: {
  incidents: ReturnType<typeof parseIncidents>;
}): React.ReactElement {
  if (incidents.length === 0) {
    return <div />;
  }

  return (
    <div style={{ ...cardStyle, marginBottom: "16px" }}>
      <h3 style={sectionTitleStyle}>Incident Timeline</h3>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {incidents.map((inc, i) => (
          <div key={i} style={incidentItemStyle}>
            <span style={{ fontSize: "14px", flexShrink: 0 }}>{inc.icon}</span>
            <span style={{ color: "var(--mixa-text-muted)" }}>{inc.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Add Endpoint Form ─────────────────────────────────────────

interface AddEndpointFormProps {
  onAdd: (name: string, url: string, method: string, interval: string) => void;
  onCancel: () => void;
}

function AddEndpointForm({ onAdd, onCancel }: AddEndpointFormProps): React.ReactElement {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [interval, setInterval] = useState("60");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (name && url) {
        onAdd(name, url, method, interval);
      }
    },
    [name, url, method, interval, onAdd],
  );

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    borderRadius: "6px",
    border: "1px solid var(--mixa-border-default)",
    backgroundColor: "var(--mixa-bg-elevated)",
    color: "var(--mixa-text-primary)",
    fontSize: "13px",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    color: "var(--mixa-text-muted)",
    marginBottom: "4px",
  };

  return (
    <div style={addEndpointFormStyle}>
      <h3 style={sectionTitleStyle}>Add Endpoint</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: "120px" }}>
          <label htmlFor="ep-name" style={labelStyle}>Name</label>
          <input
            id="ep-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My API"
            required
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 3, minWidth: "200px" }}>
          <label htmlFor="ep-url" style={labelStyle}>URL</label>
          <input
            id="ep-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/health"
            required
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1, minWidth: "80px" }}>
          <label htmlFor="ep-method" style={labelStyle}>Method</label>
          <select
            id="ep-method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={inputStyle}
          >
            <option value="GET">GET</option>
            <option value="HEAD">HEAD</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: "80px" }}>
          <label htmlFor="ep-interval" style={labelStyle}>Interval (sec)</label>
          <input
            id="ep-interval"
            type="number"
            min="10"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            placeholder="60"
            style={inputStyle}
          />
        </div>
        <button type="submit" style={{ ...actionButtonStyle, backgroundColor: "var(--mixa-accent-primary)", color: "#fff" }}>
          Add
        </button>
        <button type="button" onClick={onCancel} style={actionButtonStyle}>
          Cancel
        </button>
      </form>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function HealthDashboard(): React.ReactElement {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const updateTab = useTabStore((s) => s.updateTab);
  const engineConnected = useEngineStore((s) => s.connected);

  const [showAddForm, setShowAddForm] = useState(false);

  const streamId = activeTabId ? `health-dash-${activeTabId}` : "health-dash-default";
  const { view, state, error, sendEvent, reconnect } = useTerminalStream(streamId, "pulse");

  // Update tab title
  useEffect(() => {
    if (activeTabId) {
      updateTab(activeTabId, { title: "Health Dashboard" });
    }
  }, [activeTabId, updateTab]);

  // ─── Event handlers ──────────────────────────────────────

  const handleRefresh = useCallback(() => {
    sendEvent({
      module: "pulse",
      actionId: "refresh",
      componentId: null,
      eventType: "click",
      data: {},
    });
  }, [sendEvent]);

  const handleTestNow = useCallback(
    (id: string) => {
      sendEvent({
        module: "pulse",
        actionId: "test-now",
        componentId: null,
        eventType: "click",
        data: { id },
      });
    },
    [sendEvent],
  );

  const handleRemoveEndpoint = useCallback(
    (id: string) => {
      sendEvent({
        module: "pulse",
        actionId: "remove-endpoint",
        componentId: null,
        eventType: "click",
        data: { id },
      });
    },
    [sendEvent],
  );

  const handleCheckSSL = useCallback(
    (id: string) => {
      sendEvent({
        module: "pulse",
        actionId: "check-ssl",
        componentId: null,
        eventType: "click",
        data: { id },
      });
    },
    [sendEvent],
  );

  const handleAddEndpoint = useCallback(
    (name: string, url: string, method: string, interval: string) => {
      sendEvent({
        module: "pulse",
        actionId: "add-endpoint",
        componentId: null,
        eventType: "click",
        data: { name, url, method, interval },
      });
      setShowAddForm(false);
    },
    [sendEvent],
  );

  const handleTableEvent = useCallback(
    (event: UIEvent) => {
      sendEvent(event);
    },
    [sendEvent],
  );

  const toggleAddForm = useCallback(() => {
    setShowAddForm((prev) => !prev);
  }, []);

  const hideAddForm = useCallback(() => {
    setShowAddForm(false);
  }, []);

  // ─── Extract data from UIView ────────────────────────────

  const metricsComponent = view ? findComponent(view, "pulse-metrics") : null;
  const chartComponent = view ? findComponent(view, "pulse-response-chart") : null;
  const uptimeTableComponent = view ? findComponent(view, "pulse-uptime-table") : null;
  const sslTableComponent = view ? findComponent(view, "pulse-ssl-table") : null;
  const incidentListComponent = view ? findComponent(view, "pulse-incidents") : null;

  const uptimeRows = useMemo(() => parseUptimeRows(uptimeTableComponent ?? undefined), [uptimeTableComponent]);
  const sslRows = useMemo(() => parseSSLRows(sslTableComponent ?? undefined), [sslTableComponent]);
  const incidents = useMemo(() => parseIncidents(incidentListComponent ?? undefined), [incidentListComponent]);
  const healthScore = useMemo(() => calculateHealthScore(uptimeRows), [uptimeRows]);

  // ─── Engine not connected ────────────────────────────────

  if (!engineConnected) {
    return (
      <div style={containerStyle}>
        <div style={centerStyle}>
          <div style={{ fontSize: "32px" }}>&#x26A0;&#xFE0F;</div>
          <div style={{ fontSize: "16px", fontWeight: 600 }}>Engine Not Connected</div>
          <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>
            The Fenix engine is not running. Health data is unavailable.
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
            Loading health data...
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
            Lost connection to the health module.
          </div>
          <button type="button" onClick={reconnect} style={reconnectButtonStyle}>
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  // ─── Empty state (no endpoints) ──────────────────────────

  const hasData = uptimeRows.length > 0 || (chartComponent?.chartData?.length ?? 0) > 0;

  if (view && !hasData) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Health Dashboard</h1>
            <p style={subtitleStyle}>Endpoint uptime &amp; health monitoring</p>
          </div>
          <div style={actionsBarStyle}>
            <button type="button" onClick={toggleAddForm} style={{ ...actionButtonStyle, backgroundColor: "var(--mixa-accent-primary)", color: "#fff" }}>
              Add Endpoint
            </button>
            <button type="button" onClick={handleRefresh} style={actionButtonStyle}>
              Refresh
            </button>
          </div>
        </div>
        <div style={contentStyle}>
          {metricsComponent && <MetricRow component={metricsComponent} />}
          {showAddForm && <AddEndpointForm onAdd={handleAddEndpoint} onCancel={hideAddForm} />}
          <div style={emptyStateStyle}>
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>&#x1F3E5;</div>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>No Endpoints Monitored</div>
            <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)", maxWidth: "400px" }}>
              Add HTTP(S) endpoints to monitor their uptime, response times, and SSL certificate status. Click &quot;Add Endpoint&quot; to get started.
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
          <h1 style={titleStyle}>Health Dashboard</h1>
          <p style={subtitleStyle}>
            Endpoint uptime &amp; health monitoring
            <span
              style={{
                marginLeft: "12px",
                color: healthScore >= 100 ? "#22c55e" : healthScore >= 90 ? "#f59e0b" : "#ef4444",
                fontWeight: 500,
              }}
            >
              {healthScore}% healthy
            </span>
          </p>
        </div>
        <div style={actionsBarStyle}>
          <button type="button" onClick={toggleAddForm} style={{ ...actionButtonStyle, backgroundColor: "var(--mixa-accent-primary)", color: "#fff" }}>
            Add Endpoint
          </button>
          <button type="button" onClick={handleRefresh} style={actionButtonStyle}>
            Refresh
          </button>
        </div>
      </div>

      <div style={contentStyle}>
        {/* Metrics row */}
        {metricsComponent && <MetricRow component={metricsComponent} />}

        {/* Add endpoint form (inline, toggled) */}
        {showAddForm && (
          <AddEndpointForm onAdd={handleAddEndpoint} onCancel={hideAddForm} />
        )}

        {/* Endpoint status grid */}
        <UptimeGrid
          rows={uptimeRows}
          onTestNow={handleTestNow}
          onRemove={handleRemoveEndpoint}
          onCheckSSL={handleCheckSSL}
        />

        {/* Charts grid: response time + uptime table */}
        <div style={chartGridStyle}>
          {chartComponent && (
            <div style={cardStyle}>
              <h3 style={sectionTitleStyle}>Response Time (24h)</h3>
              <Chart component={chartComponent} />
            </div>
          )}
          {uptimeTableComponent && (
            <div style={cardStyle}>
              <h3 style={sectionTitleStyle}>Uptime Breakdown</h3>
              <Table
                component={uptimeTableComponent}
                onEvent={handleTableEvent}
                module="pulse"
              />
            </div>
          )}
        </div>

        {/* SSL certificate expiry */}
        <SSLExpirySection rows={sslRows} />

        {/* Incident timeline */}
        <IncidentTimeline incidents={incidents} />
      </div>
    </div>
  );
}
