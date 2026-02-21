# Chunk 09 — Fenix Go Engine

## Architecture

```
engine/
├── cmd/fenix/main.go         # Entry point
├── internal/
│   ├── grpc/                  # gRPC server implementation
│   │   ├── server.go          # Server setup, listener
│   │   └── handlers.go        # RPC handlers
│   ├── bus/                   # Internal event bus (pub/sub)
│   ├── storage/               # Encrypted SQLite wrapper
│   │   ├── sqlite.go          # SQLite connection + AES-256-GCM encryption
│   │   └── migrations.go      # Schema migrations
│   ├── guard/                 # Secrets & env management
│   ├── forge/                 # Git & GitHub
│   ├── ship/                  # Infrastructure & SSH
│   ├── know/                  # AI context engine
│   ├── keys/                  # Shortcuts & command palette
│   ├── data/                  # Database management
│   ├── pipe/                  # CI/CD
│   ├── cost/                  # Cloud cost tracking
│   ├── pulse/                 # Health & uptime
│   ├── play/                  # API playground
│   ├── snap/                  # Snippets & runbooks
│   ├── alert/                 # Notifications
│   ├── stats/                 # Dev analytics
│   ├── scout/                 # Automation
│   └── memory/                # Conversation backup
├── pkg/
│   ├── plugin/                # Public plugin interfaces
│   └── proto/                 # Protobuf definitions + generated code
├── go.mod
└── Makefile
```

## Module Interface

Each module implements:
```go
type Module interface {
    Name() string
    Init(bus EventBus, store Storage) error
    HandleEvent(event UIEvent) (*UIView, error)
    GetView() (*UIView, error)
    Shutdown() error
}
```

## Lifecycle (managed by Electron)
1. Electron spawns Go binary as child process on app start
2. Engine listens on Unix socket (macOS/Linux) or named pipe (Windows)
3. Electron connects via gRPC client
4. Health check polling every 10 seconds
5. Auto-restart on crash (max 3 retries, exponential backoff)
6. Graceful shutdown signal before Electron quits

## Storage
- Encrypted SQLite (AES-256-GCM) for all module data
- Encryption key derived from machine-specific identifier
- Separate DB file per project (fenix.db in project root or ~/.mixa/)

## Configuration
- `fenix.yaml` in project root for project-specific config
- `~/.mixa/config.yaml` for global settings
- Module-specific config sections within fenix.yaml
