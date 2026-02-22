// Knowledge Stats Dashboard — Shows knowledge base overview and statistics
// Data is fetched via tRPC from the in-memory capture store (will use PGlite in MIXA-046).

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@mixa-ai/ui";
import { useTabStore } from "../../stores/tabs";
import { trpc } from "../../trpc";

// ─── Types ──────────────────────────────────────────────────────

interface KnowledgeOverview {
  total: number;
  favorites: number;
  archived: number;
  totalWordCount: number;
  totalReadingTime: number;
  capturesByDay: Array<{ date: string; count: number }>;
  byItemType: Record<string, number>;
  topDomains: Array<{ key: string; count: number }>;
  recentCaptures: Array<{
    id: string;
    title: string;
    url: string | null;
    domain: string | null;
    itemType: string;
    wordCount: number | null;
    readingTime: number | null;
    capturedAt: string;
  }>;
}

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

const actionButtonStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: "6px",
  border: "1px solid var(--mixa-border-subtle)",
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

const metricsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "12px",
  marginBottom: "16px",
};

const metricCardStyle: React.CSSProperties = {
  backgroundColor: "var(--mixa-bg-surface)",
  border: "1px solid var(--mixa-border-subtle)",
  borderRadius: "8px",
  padding: "16px",
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--mixa-text-muted)",
  marginBottom: "4px",
};

const metricValueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "var(--mixa-text-primary)",
};

const metricSubStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--mixa-text-muted)",
  marginTop: "2px",
};

const chartGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
  marginBottom: "16px",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--mixa-bg-surface)",
  border: "1px solid var(--mixa-border-subtle)",
  borderRadius: "8px",
  padding: "16px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--mixa-text-primary)",
  margin: "0 0 12px 0",
};

const centerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  gap: "12px",
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

const quickActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  marginTop: "16px",
};

// ─── Helpers ────────────────────────────────────────────────────

function formatReadingTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

const TYPE_LABELS: Record<string, string> = {
  article: "Articles",
  highlight: "Highlights",
  youtube: "YouTube",
  pdf: "PDFs",
  code: "Code",
  image: "Images",
  terminal: "Terminal",
};

const TYPE_COLORS: Record<string, string> = {
  article: "#3b82f6",
  highlight: "#f59e0b",
  youtube: "#ef4444",
  pdf: "#8b5cf6",
  code: "#22c55e",
  image: "#ec4899",
  terminal: "#6b7280",
};

function relativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

// ─── Bar Chart (inline SVG) ─────────────────────────────────────

function CaptureBarChart({ data }: { data: Array<{ date: string; count: number }> }): React.ReactElement {
  if (data.length === 0) {
    return (
      <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)", textAlign: "center", padding: "24px" }}>
        No capture data for the last 30 days
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 120;
  const barWidth = Math.max(4, Math.floor((100 / data.length) * 0.7));
  const gap = Math.max(1, Math.floor((100 / data.length) * 0.3));

  return (
    <div style={{ position: "relative", height: `${chartHeight + 24}px` }}>
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${data.length * (barWidth + gap)} ${chartHeight}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Captures per day bar chart"
      >
        {data.map((d, i) => {
          const barHeight = maxCount > 0 ? (d.count / maxCount) * (chartHeight - 4) : 0;
          return (
            <rect
              key={d.date}
              x={i * (barWidth + gap)}
              y={chartHeight - barHeight}
              width={barWidth}
              height={barHeight}
              rx={2}
              fill={d.count > 0 ? "var(--mixa-accent-primary)" : "var(--mixa-bg-elevated)"}
              opacity={d.count > 0 ? 0.85 : 0.3}
            >
              <title>{`${d.date}: ${d.count} captures`}</title>
            </rect>
          );
        })}
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "10px",
          color: "var(--mixa-text-muted)",
          marginTop: "4px",
        }}
      >
        <span>{data[0]?.date.slice(5) ?? ""}</span>
        <span>{data[data.length - 1]?.date.slice(5) ?? ""}</span>
      </div>
    </div>
  );
}

// ─── Horizontal bar list ────────────────────────────────────────

function HorizontalBarList({
  items,
  maxValue,
  colorFn,
}: {
  items: Array<{ label: string; value: number }>;
  maxValue: number;
  colorFn?: (label: string) => string;
}): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--mixa-text-secondary)",
              width: "120px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            title={item.label}
          >
            {item.label}
          </span>
          <div
            style={{
              flex: 1,
              height: "16px",
              backgroundColor: "var(--mixa-bg-elevated)",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                backgroundColor: colorFn ? colorFn(item.label) : "var(--mixa-accent-primary)",
                borderRadius: "4px",
                transition: "width 300ms ease",
                minWidth: item.value > 0 ? "2px" : "0",
              }}
            />
          </div>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--mixa-text-primary)",
              minWidth: "24px",
              textAlign: "right",
            }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function KnowledgeDashboard(): React.ReactElement {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const updateTab = useTabStore((s) => s.updateTab);
  const addTab = useTabStore((s) => s.addTab);

  const [stats, setStats] = useState<KnowledgeOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update tab title
  useEffect(() => {
    if (activeTabId) {
      updateTab(activeTabId, { title: "Knowledge Stats" });
    }
  }, [activeTabId, updateTab]);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await trpc.knowledgeStats.overview.query();
      setStats(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load knowledge stats");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load stats on mount
  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // Quick action handlers
  const handleOpenKnowledge = useCallback(() => {
    addTab("knowledge");
  }, [addTab]);

  const handleNewCapture = useCallback(() => {
    addTab("web");
  }, [addTab]);

  const handleNewChat = useCallback(() => {
    addTab("chat");
  }, [addTab]);

  // ─── Loading state ───────────────────────────────────────

  if (isLoading && !stats) {
    return (
      <div style={containerStyle}>
        <div style={centerStyle}>
          <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>
            Loading knowledge stats...
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────

  if (error && !stats) {
    return (
      <div style={containerStyle}>
        <div style={centerStyle}>
          <Icon name="error" size={32} />
          <div style={{ fontSize: "16px", fontWeight: 600 }}>Failed to load stats</div>
          <div style={{ fontSize: "14px", color: "#ef4444", textAlign: "center", maxWidth: "400px" }}>
            {error}
          </div>
          <button type="button" onClick={() => void loadStats()} style={actionButtonStyle}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Empty state ─────────────────────────────────────────

  if (!stats || stats.total === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Knowledge Stats</h1>
            <p style={subtitleStyle}>Your knowledge base overview</p>
          </div>
        </div>
        <div style={contentStyle}>
          <div style={emptyStateStyle}>
            <Icon name="knowledge" size={48} style={{ marginBottom: "8px" }} />
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>No Items Yet</div>
            <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)", maxWidth: "400px" }}>
              Start capturing web pages, highlights, and code snippets to see your knowledge base stats here.
              Use Cmd+S on any web page to save it.
            </div>
            <div style={quickActionsStyle}>
              <button type="button" onClick={handleOpenKnowledge} style={actionButtonStyle}>
                Open Knowledge Base
              </button>
              <button type="button" onClick={handleNewCapture} style={actionButtonStyle}>
                New Capture
              </button>
              <button type="button" onClick={handleNewChat} style={actionButtonStyle}>
                Start Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Full dashboard ──────────────────────────────────────

  // Prepare type breakdown data from byItemType record
  const typeBreakdown = Object.entries(stats.byItemType)
    .map(([itemType, count]) => ({ itemType, count }))
    .sort((a, b) => b.count - a.count);
  const typeMax = typeBreakdown.length > 0 ? typeBreakdown[0]!.count : 1;

  const domainMax = stats.topDomains.length > 0 ? stats.topDomains[0]!.count : 1;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Knowledge Stats</h1>
          <p style={subtitleStyle}>Your knowledge base overview</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" onClick={handleOpenKnowledge} style={actionButtonStyle}>
            Open Knowledge
          </button>
          <button type="button" onClick={handleNewCapture} style={actionButtonStyle}>
            New Capture
          </button>
          <button type="button" onClick={handleNewChat} style={actionButtonStyle}>
            Start Chat
          </button>
          <button type="button" onClick={() => void loadStats()} style={actionButtonStyle}>
            Refresh
          </button>
        </div>
      </div>

      <div style={contentStyle}>
        {/* Metrics row */}
        <div style={metricsGridStyle}>
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>Total Items</div>
            <div style={metricValueStyle}>{formatNumber(stats.total)}</div>
            <div style={metricSubStyle}>{stats.favorites} favorited</div>
          </div>
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>Total Words</div>
            <div style={metricValueStyle}>{formatNumber(stats.totalWordCount)}</div>
            <div style={metricSubStyle}>across all captures</div>
          </div>
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>Reading Time</div>
            <div style={metricValueStyle}>{formatReadingTime(stats.totalReadingTime)}</div>
            <div style={metricSubStyle}>estimated total</div>
          </div>
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>Domains</div>
            <div style={metricValueStyle}>{stats.topDomains.length}</div>
            <div style={metricSubStyle}>unique sources</div>
          </div>
        </div>

        {/* Charts row */}
        <div style={chartGridStyle}>
          {/* Captures per day */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Captures (last 30 days)</h3>
            <CaptureBarChart data={stats.capturesByDay} />
          </div>

          {/* Type breakdown */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Item Types</h3>
            {typeBreakdown.length > 0 ? (
              <HorizontalBarList
                items={typeBreakdown.map((t) => ({
                  label: TYPE_LABELS[t.itemType] ?? t.itemType,
                  value: t.count,
                }))}
                maxValue={typeMax}
                colorFn={(label) => {
                  const entry = Object.entries(TYPE_LABELS).find(([, v]) => v === label);
                  return entry ? (TYPE_COLORS[entry[0]] ?? "var(--mixa-accent-primary)") : "var(--mixa-accent-primary)";
                }}
              />
            ) : (
              <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>
                No type data yet
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: domains + recent captures */}
        <div style={chartGridStyle}>
          {/* Top domains */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Top Domains</h3>
            {stats.topDomains.length > 0 ? (
              <HorizontalBarList
                items={stats.topDomains.map((d) => ({
                  label: d.key,
                  value: d.count,
                }))}
                maxValue={domainMax}
              />
            ) : (
              <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>
                No domain data yet
              </div>
            )}
          </div>

          {/* Recent captures */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Recent Captures</h3>
            {stats.recentCaptures.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {stats.recentCaptures.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--mixa-border-subtle)",
                    }}
                  >
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "2px",
                        backgroundColor: TYPE_COLORS[item.itemType] ?? "var(--mixa-bg-elevated)",
                        flexShrink: 0,
                        display: "inline-block",
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: "12px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--mixa-text-muted)", flexShrink: 0 }}>
                      {relativeTime(item.capturedAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "var(--mixa-text-muted)" }}>
                No captures yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
