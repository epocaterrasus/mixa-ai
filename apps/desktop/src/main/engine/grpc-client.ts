import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import type { EngineModule, EngineModuleName, EngineStatusCode } from "@mixa-ai/types";

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

const PROTO_LOAD_OPTIONS: protoLoader.Options = {
  keepCase: false,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
};

const VALID_STATUS_CODES = new Set<string>(["running", "stopped", "error", "starting"]);

function toStatusCode(raw: string): EngineStatusCode {
  return VALID_STATUS_CODES.has(raw) ? (raw as EngineStatusCode) : "stopped";
}

/**
 * gRPC client wrapper for communicating with the Fenix Go engine.
 * Provides typed methods for health checks and module management.
 */
export class EngineGrpcClient {
  private healthClient: HealthServiceClient | null = null;
  private moduleClient: ModuleServiceClient | null = null;

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

  disconnect(): void {
    if (this.healthClient) {
      this.healthClient.close();
      this.healthClient = null;
    }
    if (this.moduleClient) {
      this.moduleClient.close();
      this.moduleClient = null;
    }
  }
}
