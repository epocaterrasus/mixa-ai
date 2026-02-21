# Chunk 10 — Engine Module Specifications

## Phase 1 Modules (ship with MVP)

### GUARD — Secrets & Environment Management
- List env vars for current project (masked by default)
- Reveal individual values on demand
- Switch between environments (dev/staging/prod)
- Import from .env files, export sanitized .env.example
- Encrypted storage (AES-256-GCM in SQLite)
- UIView: Table with Key, Value (masked), Environment, Source columns

### FORGE — Git & GitHub
- List local repos (directory scanning)
- Current branch, recent commits, changed files
- GitHub PRs (list with status, reviewers, labels)
- GitHub issues (list with status, assignees)
- File browser (navigate tree, view contents)
- Actions: checkout, pull, push, open PR in web tab
- UIView: Cards (repo info) + List (file tree) + Table (PRs/issues)

### KEYS — Shortcuts & Command Palette
- Default shortcut map for all modules
- User-customizable shortcuts (stored in config)
- Conflict detection
- Command palette data endpoint (for Electron omnibar integration)
- Import/export shortcut configs

## Phase 2 Modules (after MVP)

### COST — Cloud Cost Tracking
- Provider adapters: DigitalOcean, AWS, manual entry
- Cost polling on schedule (hourly/daily)
- Budget limits with threshold alerts (80/90/100%)
- UIView: MetricRow + Chart (time-series) + Table (per-service)

### PULSE — Health & Uptime
- HTTP(S) endpoint pinging on schedule
- SSL certificate expiry tracking (30/14/7 day alerts)
- Uptime calculation (24h, 7d, 30d)
- Response time tracking (p50/p95/p99)
- Incident log (down/up events)
- UIView: uptime grid + response time chart + SSL table + incident timeline

### DATA — Database Management
- Schema viewer (tables, columns, relationships)
- Query runner (with safety rails)
- Migration tracking
- NL→SQL via AI (Phase 3)

### PIPE — CI/CD Dashboard
- Pipeline status from GitHub Actions / GitLab CI
- Docker container management
- Deploy triggers
- Build log viewing

### Additional Modules (Phase 3+)
PLAY (API playground), SNAP (snippets), ALERT (notifications), STATS (analytics), SCOUT (automation), MEMORY (context), SHIP (SSH/tunnels), KNOW (AI context)
