// Pure helper functions for the Health Dashboard
// Extracted for testability.

import type { UIComponent, UIView } from "@mixa-ai/types";

/** Find a component in a UIView by its id */
export function findComponent(
  view: UIView,
  id: string,
): UIComponent | undefined {
  return view.components.find((c) => c.id === id);
}

// ─── Uptime status helpers ────────────────────────────────────

export type EndpointStatus = "up" | "down" | "unknown";

export interface UptimeRowData {
  id: string;
  name: string;
  url: string;
  status: EndpointStatus;
  uptime24h: string;
  uptime7d: string;
  uptime30d: string;
  p50: string;
  p95: string;
  p99: string;
}

/** Parse rows from the pulse-uptime-table into structured data */
export function parseUptimeRows(
  tableComponent: UIComponent | undefined,
): UptimeRowData[] {
  if (!tableComponent?.rows) return [];

  return tableComponent.rows.map((row) => ({
    id: row.values["id"] ?? "",
    name: row.values["name"] ?? "Unknown",
    url: row.values["url"] ?? "",
    status: parseEndpointStatus(row.values["status"]),
    uptime24h: row.values["uptime_24h"] ?? "—",
    uptime7d: row.values["uptime_7d"] ?? "—",
    uptime30d: row.values["uptime_30d"] ?? "—",
    p50: row.values["p50"] ?? "—",
    p95: row.values["p95"] ?? "—",
    p99: row.values["p99"] ?? "—",
  }));
}

function parseEndpointStatus(value: string | undefined): EndpointStatus {
  if (value === "up" || value === "down") return value;
  return "unknown";
}

// ─── SSL helpers ──────────────────────────────────────────────

export type SSLAlertLevel = "ok" | "caution" | "warning" | "critical";

export interface SSLRowData {
  name: string;
  issuer: string;
  expires: string;
  daysLeft: number;
  alertLevel: SSLAlertLevel;
}

/** Parse rows from the pulse-ssl-table into structured data */
export function parseSSLRows(
  tableComponent: UIComponent | undefined,
): SSLRowData[] {
  if (!tableComponent?.rows) return [];

  return tableComponent.rows.map((row) => ({
    name: row.values["name"] ?? "Unknown",
    issuer: row.values["issuer"] ?? "Unknown",
    expires: row.values["expires"] ?? "",
    daysLeft: parseInt(row.values["days_left"] ?? "0", 10),
    alertLevel: parseSSLAlertLevel(row.values["alert"]),
  }));
}

function parseSSLAlertLevel(value: string | undefined): SSLAlertLevel {
  if (
    value === "ok" ||
    value === "caution" ||
    value === "warning" ||
    value === "critical"
  ) {
    return value;
  }
  return "ok";
}

// ─── Incident helpers ─────────────────────────────────────────

export interface IncidentData {
  icon: string;
  text: string;
}

/** Parse incident list items into structured data */
export function parseIncidents(
  listComponent: UIComponent | undefined,
): IncidentData[] {
  if (!listComponent?.items) return [];

  return listComponent.items.map((item) => {
    // Items follow the format: "icon timestamp name — message"
    // The icon is the first character(s) (emoji)
    const isUp = item.includes("\u{1F7E2}"); // green circle
    return {
      icon: isUp ? "\u{1F7E2}" : "\u{1F534}",
      text: item,
    };
  });
}

// ─── Color helpers ────────────────────────────────────────────

/** Return CSS color for endpoint status */
export function getStatusColor(status: EndpointStatus): string {
  switch (status) {
    case "up":
      return "#22c55e";
    case "down":
      return "#ef4444";
    default:
      return "#6b7280";
  }
}

/** Return CSS color for SSL alert level */
export function getSSLAlertColor(level: SSLAlertLevel): string {
  switch (level) {
    case "critical":
      return "#ef4444";
    case "warning":
      return "#f97316";
    case "caution":
      return "#f59e0b";
    default:
      return "#22c55e";
  }
}

/** Return status label text */
export function getStatusLabel(status: EndpointStatus): string {
  switch (status) {
    case "up":
      return "Healthy";
    case "down":
      return "Down";
    default:
      return "Unknown";
  }
}

/** Calculate overall health percentage from uptime rows */
export function calculateHealthScore(rows: UptimeRowData[]): number {
  if (rows.length === 0) return 100;
  const upCount = rows.filter((r) => r.status === "up").length;
  return Math.round((upCount / rows.length) * 100);
}
