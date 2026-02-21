# Fenix Engine — Go Sidecar

The Fenix engine is a Go binary that runs as a sidecar process alongside the Electron app. It provides infrastructure modules (secrets, Git, costs, uptime monitoring, shortcuts) exposed over gRPC using a declarative UI protocol.

## Architecture

```
engine/
├── cmd/fenix/main.go          # Binary entry point
├── api/proto/fenix.proto      # gRPC + Fenix UI protocol definition
├── internal/
│   ├── grpc/                  # gRPC server implementation
│   │   ├── server.go          # Server setup and lifecycle
│   │   ├── health.go          # Health check service
│   │   ├── modules.go         # Module listing service
│   │   └── uistream.go        # UI streaming service
│   ├── module/                # Module registry and interfaces
│   │   ├── registry.go        # Module lifecycle management
│   │   └── ui.go              # UIProvider interface
│   ├── modules/               # Built-in modules
│   │   ├── guard/             # Secrets & environment management
│   │   ├── forge/             # Git & GitHub integration
│   │   ├── cost/              # Cloud cost tracking
│   │   ├── pulse/             # Health & uptime monitoring
│   │   ├── keys/              # Keyboard shortcuts & commands
│   │   └── system/            # Engine health/version
│   └── storage/               # Encrypted SQLite wrapper (AES-256-GCM)
├── pkg/proto/                 # Generated protobuf Go code
├── Makefile                   # Build targets
└── go.mod                     # Go module (1.22+)
```

## Building

```bash
# Build for current platform
make build

# Cross-compile for all platforms
make build-all
# Outputs: bin/fenix-darwin-arm64, bin/fenix-darwin-amd64,
#          bin/fenix-linux-amd64, bin/fenix-windows-amd64.exe

# Regenerate protobuf code (requires protoc + Go plugins)
make proto

# Run linter
make lint
```

## Running

```bash
# Start with default address
./bin/fenix-darwin-arm64

# Start with custom address
./bin/fenix-darwin-arm64 -addr localhost:9090

# Start with OS-assigned port (used by Electron)
./bin/fenix-darwin-arm64 -addr localhost:0
```

The engine prints `gRPC server listening on <addr>` to stdout, which the Electron app parses to discover the port.

## Testing

```bash
go test ./...      # Run all tests
go vet ./...       # Static analysis
make lint          # golangci-lint (if installed)
```

## gRPC Services

Defined in `api/proto/fenix.proto`:

### HealthService

```protobuf
rpc Check(HealthCheckRequest) returns (HealthCheckResponse)
```

Returns `healthy` (bool), `status` (running/stopped/error/starting), `version`, `uptime_seconds`.

### ModuleService

```protobuf
rpc ListModules(ListModulesRequest) returns (ListModulesResponse)
rpc GetModuleStatus(GetModuleStatusRequest) returns (ModuleStatus)
```

Returns module metadata: name, display name, description, enabled state, status, error message.

### UIStreamService

```protobuf
rpc StreamUI(UIStreamRequest) returns (stream UIViewUpdate)
rpc SendEvent(UIEventRequest) returns (UIEventResponse)
```

Core of the Fenix UI protocol. `StreamUI` opens a server-side stream that pushes declarative UI updates (`UIViewUpdate`) to the renderer. `SendEvent` receives user interactions (clicks, inputs, shortcuts) from the renderer.

## Module System

### Module Interface

Every module implements the `Module` interface:

```go
type Module interface {
    Name() string
    DisplayName() string
    Description() string
    Start() error
    Stop() error
}
```

### UIProvider Interface

Modules that render UI also implement `UIProvider`:

```go
type UIProvider interface {
    CurrentView() *pb.UIViewUpdate
    HandleEvent(*pb.UIEventRequest) error
    Subscribe(fn func(*pb.UIViewUpdate)) func()
}
```

- `CurrentView()` returns the current declarative UI state
- `HandleEvent()` processes user interactions and updates internal state
- `Subscribe()` registers a callback for UI changes; returns an unsubscribe function

### Module Registry

The registry manages module lifecycle:

```go
registry := module.NewRegistry()
registry.Register(guard.New(store))
registry.StartAll()
defer registry.StopAll()
```

## Built-in Modules

### GUARD — Secrets & Environment Management

- Three environments: dev, staging, prod
- Secrets stored as JSON in encrypted SQLite
- Import from `.env` files, export sanitized `.env.example`
- UI: environment selector, secrets table with masked values, add/reveal/copy actions

### FORGE — Git & GitHub

- Scans `~/Developer` for git repositories (2 levels deep)
- Shows current branch, recent commits, changed files, branches
- Lists GitHub PRs and issues via `gh` CLI
- File browser for repository trees
- UI: repo cards, file tree, commit table, PR/issue tables

### COST — Cloud Cost Tracking

- Provider adapters: Manual, DigitalOcean (stub), AWS (stub)
- Budget limits with alerts at 80%, 90%, 100%
- Background polling (hourly/daily)
- Cost projections and service breakdown
- UI: metric cards, area charts, budget alerts, service breakdown table

### PULSE — Health & Uptime Monitoring

- HTTP(S) endpoint health checking on configurable schedule
- SSL certificate expiry tracking (30/14/7 day alerts)
- Uptime calculation: 24h, 7d, 30d
- Response time percentiles: p50, p95, p99
- Incident log with up/down timestamps
- UI: uptime grid, response time charts, SSL expiry table, incident timeline

### KEYS — Keyboard Shortcuts

- Default shortcut map for all modules
- User-customizable shortcuts (stored in encrypted SQLite)
- Conflict detection
- Command palette data for the Electron omnibar

## Encrypted Storage

Each module stores data in its own encrypted SQLite database at `~/.mixa/data/{module}/{module}.db`. The `storage.Store` wrapper provides:

- AES-256-GCM encryption at the application layer
- Simple key-value API: `Put(key, plaintext)`, `Get(key)`, `Delete(key)`
- Values stored as `hex(nonce || ciphertext)` in a `kv(key TEXT PK, value TEXT)` table
- Pure-Go SQLite implementation (`modernc.org/sqlite`) — no CGO required

Key derivation in development: SHA-256 of `"mixa-guard-" + hostname`. Production will use the OS keychain.

## Data Directories

```
~/.mixa/data/
├── guard/guard.db     # Encrypted secrets
├── keys/keys.db       # Custom shortcuts
├── cost/cost.db       # Cost entries and budgets
└── pulse/pulse.db     # Endpoints and incidents
```
