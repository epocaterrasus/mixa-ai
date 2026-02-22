import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import type {
  EngineModule,
  EngineModuleName,
  EngineStatusCode,
  UIAction,
  UIComponent,
  UIView,
  ChartType,
  TrendDirection,
  FormField,
} from "@mixa-ai/types";

/** Health check result from the Go engine */
export interface HealthCheckResult {
  healthy: boolean;
  status: EngineStatusCode;
  version: string;
  uptime: number;
}

/** Raw proto response types (mapped from fenix.proto) */
interface ProtoHealthCheckResponse {
  healthy: boolean;
  status: string;
  version: string;
  uptimeSeconds: number;
}

interface ProtoModuleStatus {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  status: string;
  errorMessage: string;
}

interface ProtoListModulesResponse {
  modules: ProtoModuleStatus[];
}

interface ProtoUIViewUpdate {
  module: string;
  components: ProtoUIComponent[];
  actions: ProtoUIAction[];
}

interface ProtoUIComponent {
  id: string;
  type: string;
  level?: number;
  content?: string;
  preformatted?: boolean;
  columns?: Array<{ key: string; label: string; sortable: boolean; width?: number }>;
  rows?: Array<{ values: Record<string, string> }>;
  metrics?: Array<{ label: string; value: string; trend: string; changePercent: number }>;
  chartType?: string;
  chartData?: Array<{ values: Record<string, string> }>;
  items?: string[];
  fields?: Array<{
    id: string;
    label: string;
    fieldType: string;
    placeholder?: string;
    required: boolean;
    options?: string[];
  }>;
}

interface ProtoUIAction {
  id: string;
  label: string;
  shortcut?: string;
  enabled: boolean;
}

interface ProtoUIEventResponse {
  accepted: boolean;
}

/** Typed gRPC client interfaces matching fenix.proto services */
interface HealthServiceClient extends grpc.Client {
  check(
    request: Record<string, never>,
    callback: grpc.requestCallback<ProtoHealthCheckResponse>,
  ): grpc.ClientUnaryCall;
}

interface ModuleServiceClient extends grpc.Client {
  listModules(
    request: Record<string, never>,
    callback: grpc.requestCallback<ProtoListModulesResponse>,
  ): grpc.ClientUnaryCall;
}

interface UIStreamServiceClient extends grpc.Client {
  // lodash.camelCase("StreamUI") → "streamUi" (not "streamUI")
  // @grpc/proto-loader uses lodash.camelCase for the originalName alias
  streamUi(
    request: { module: string },
  ): grpc.ClientReadableStream<ProtoUIViewUpdate>;
  sendEvent(
    request: {
      module: string;
      actionId?: string;
      componentId?: string;
      eventType: string;
      data: Record<string, string>;
    },
    callback: grpc.requestCallback<ProtoUIEventResponse>,
  ): grpc.ClientUnaryCall;
}

const PROTO_LOAD_OPTIONS: protoLoader.Options = {
  keepCase: false,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
};

const VALID_STATUS_CODES = new Set<string>(["running", "stopped", "error", "starting"]);
const VALID_CHART_TYPES = new Set<string>(["area", "bar", "line", "pie"]);
const VALID_TREND_DIRS = new Set<string>(["up", "down", "flat"]);
const VALID_FIELD_TYPES = new Set<string>(["text", "number", "select", "checkbox", "password"]);

function toStatusCode(raw: string): EngineStatusCode {
  return VALID_STATUS_CODES.has(raw) ? (raw as EngineStatusCode) : "stopped";
}

function toChartType(raw: string): ChartType {
  return VALID_CHART_TYPES.has(raw) ? (raw as ChartType) : "line";
}

function toTrend(raw: string): TrendDirection {
  return VALID_TREND_DIRS.has(raw) ? (raw as TrendDirection) : "flat";
}

function toFieldType(raw: string): FormField["fieldType"] {
  return VALID_FIELD_TYPES.has(raw) ? (raw as FormField["fieldType"]) : "text";
}

/** Convert a proto UIComponent to the TypeScript UIComponent type */
function convertComponent(proto: ProtoUIComponent): UIComponent {
  return {
    id: proto.id,
    type: proto.type as UIComponent["type"],
    level: proto.level ?? null,
    content: proto.content ?? null,
    preformatted: proto.preformatted ?? null,
    columns: proto.columns
      ? proto.columns.map((c) => ({
          key: c.key,
          label: c.label,
          sortable: c.sortable,
          width: c.width ?? null,
        }))
      : null,
    rows: proto.rows
      ? proto.rows.map((r) => ({ values: r.values }))
      : null,
    metrics: proto.metrics
      ? proto.metrics.map((m) => ({
          label: m.label,
          value: m.value,
          trend: toTrend(m.trend),
          changePercent: m.changePercent,
        }))
      : null,
    chartType: proto.chartType ? toChartType(proto.chartType) : null,
    chartData: proto.chartData
      ? proto.chartData.map((d) => ({ values: d.values }))
      : null,
    items: proto.items && proto.items.length > 0 ? proto.items : null,
    fields: proto.fields
      ? proto.fields.map((f) => ({
          id: f.id,
          label: f.label,
          fieldType: toFieldType(f.fieldType),
          placeholder: f.placeholder ?? null,
          required: f.required,
          options: f.options && f.options.length > 0 ? f.options : null,
        }))
      : null,
  };
}

/** Convert a proto UIAction to the TypeScript UIAction type */
function convertAction(proto: ProtoUIAction): UIAction {
  return {
    id: proto.id,
    label: proto.label,
    shortcut: proto.shortcut ?? null,
    enabled: proto.enabled,
  };
}

/** Convert a full proto UIViewUpdate to a TypeScript UIView */
export function convertViewUpdate(proto: ProtoUIViewUpdate): UIView {
  return {
    module: proto.module,
    components: (proto.components || []).map(convertComponent),
    actions: (proto.actions || []).map(convertAction),
  };
}

/**
 * gRPC client wrapper for communicating with the Fenix Go engine.
 * Provides typed methods for health checks, module management, and UI streaming.
 */
export class EngineGrpcClient {
  private healthClient: HealthServiceClient | null = null;
  private moduleClient: ModuleServiceClient | null = null;
  private uiStreamClient: UIStreamServiceClient | null = null;

  async connect(address: string, protoPath: string): Promise<void> {
    const packageDefinition = await protoLoader.load(protoPath, PROTO_LOAD_OPTIONS);
    const proto = grpc.loadPackageDefinition(packageDefinition);
    const fenixPkg = proto["fenix"] as Record<string, grpc.ServiceClientConstructor>;

    const credentials = grpc.credentials.createInsecure();

    this.healthClient = new fenixPkg["HealthService"]!(
      address,
      credentials,
    ) as unknown as HealthServiceClient;

    this.moduleClient = new fenixPkg["ModuleService"]!(
      address,
      credentials,
    ) as unknown as ModuleServiceClient;

    this.uiStreamClient = new fenixPkg["UIStreamService"]!(
      address,
      credentials,
    ) as unknown as UIStreamServiceClient;
  }

  healthCheck(): Promise<HealthCheckResult> {
    return new Promise((resolve, reject) => {
      if (!this.healthClient) {
        reject(new Error("Health client not connected"));
        return;
      }

      this.healthClient.check({} as Record<string, never>, (error, response) => {
        if (error) {
          reject(error);
          return;
        }
        if (!response) {
          reject(new Error("Empty health check response"));
          return;
        }
        resolve({
          healthy: response.healthy,
          status: toStatusCode(response.status),
          version: response.version,
          uptime: response.uptimeSeconds,
        });
      });
    });
  }

  listModules(): Promise<EngineModule[]> {
    return new Promise((resolve, reject) => {
      if (!this.moduleClient) {
        reject(new Error("Module client not connected"));
        return;
      }

      this.moduleClient.listModules({} as Record<string, never>, (error, response) => {
        if (error) {
          reject(error);
          return;
        }
        if (!response) {
          resolve([]);
          return;
        }
        resolve(
          (response.modules || []).map((m) => ({
            name: m.name as EngineModuleName,
            displayName: m.displayName,
            description: m.description,
            enabled: m.enabled,
            status: toStatusCode(m.status),
            errorMessage: m.errorMessage || null,
          })),
        );
      });
    });
  }

  /**
   * Open a server-side streaming connection to receive UI view updates
   * from a specific engine module. Returns a readable gRPC stream.
   */
  streamUI(module: string): grpc.ClientReadableStream<ProtoUIViewUpdate> {
    if (!this.uiStreamClient) {
      throw new Error("UIStream client not connected");
    }
    return this.uiStreamClient.streamUi({ module });
  }

  /**
   * Send a user interaction event to the engine.
   * Returns whether the engine accepted the event.
   */
  sendEvent(request: {
    module: string;
    actionId?: string;
    componentId?: string;
    eventType: string;
    data: Record<string, string>;
  }): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.uiStreamClient) {
        reject(new Error("UIStream client not connected"));
        return;
      }

      this.uiStreamClient.sendEvent(request, (error, response) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(response?.accepted ?? false);
      });
    });
  }

  disconnect(): void {
    if (this.healthClient) {
      this.healthClient.close();
      this.healthClient = null;
    }
    if (this.moduleClient) {
      this.moduleClient.close();
      this.moduleClient = null;
    }
    if (this.uiStreamClient) {
      this.uiStreamClient.close();
      this.uiStreamClient = null;
    }
  }
}
