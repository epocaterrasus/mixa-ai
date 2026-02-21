// @mixa-ai/types — Fenix UI Protocol types (terminal renderer)

/** The type of a UI component rendered in a terminal tab */
export type UIComponentType =
  | "header"
  | "text_block"
  | "table"
  | "card"
  | "metric_row"
  | "chart"
  | "list"
  | "form"
  | "action_bar"
  | "status_bar";

/** Chart variant for chart components */
export type ChartType = "area" | "bar" | "line" | "pie";

/** Trend direction for metric cards */
export type TrendDirection = "up" | "down" | "flat";

/** A single metric in a MetricRow */
export interface Metric {
  label: string;
  value: string;
  trend: TrendDirection;
  changePercent: number;
}

/** A single row in a table, mapping column keys to cell values */
export interface RowData {
  values: Record<string, string>;
}

/** A single data point in a chart, mapping axis/series keys to values */
export interface ChartDataPoint {
  values: Record<string, string>;
}

/** Column definition for table components */
export interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
  width: number | null;
}

/** Field definition for form components */
export interface FormField {
  id: string;
  label: string;
  fieldType: "text" | "number" | "select" | "checkbox" | "password";
  placeholder: string | null;
  required: boolean;
  options: string[] | null;
}

/** A UI component rendered in the terminal renderer */
export interface UIComponent {
  id: string;
  type: UIComponentType;
  /** Heading level for header components */
  level: number | null;
  /** Text/heading content */
  content: string | null;
  /** Whether content is preformatted */
  preformatted: boolean | null;
  /** Table columns */
  columns: TableColumn[] | null;
  /** Table/list row data */
  rows: Record<string, unknown>[] | null;
  /** Metrics for metric_row components */
  metrics: Metric[] | null;
  /** Chart type and data */
  chartType: ChartType | null;
  chartData: Record<string, unknown>[] | null;
  /** List items */
  items: string[] | null;
  /** Form fields */
  fields: FormField[] | null;
}

/** An available action in the UI */
export interface UIAction {
  id: string;
  label: string;
  shortcut: string | null;
  enabled: boolean;
}

/** A complete view rendered by an engine module */
export interface UIView {
  module: string;
  components: UIComponent[];
  actions: UIAction[];
}

/** User interaction event sent from renderer to engine */
export interface UIEvent {
  actionId: string | null;
  componentId: string | null;
  eventType: "click" | "input" | "shortcut" | "scroll";
  data: Record<string, string>;
}
