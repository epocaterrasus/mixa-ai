# Chunk 15 — Local-First Architecture, Auth & Backup

## Core Principle
Mixa handles ZERO user data on our servers. Everything runs locally.

## PGlite (Embedded PostgreSQL)
- `@electric-sql/pglite` — PostgreSQL compiled to WASM
- Runs in-process inside Electron main process
- Data directory: `~/.mixa/data/pglite/`
- Includes pgvector extension for embedding storage
- Full SQL support (it's real PostgreSQL, just embedded)
- No Docker, no installation, no configuration
- Drizzle ORM works with PGlite via pg-compatible driver

## Job Queue (No Redis)
- Use `p-queue` (in-memory concurrency-limited queue)
- AI jobs (embed, summarize, tag) queued in-memory
- If app closes mid-job, re-queue on next launch (check for items without embeddings)
- No persistence needed — jobs are idempotent (re-running is safe)

## Clerk (Licensing Only)
- Clerk answers ONE question: "Does this user have a valid Pro license?"
- Free tier works with ZERO Clerk interaction (no account needed)
- On launch: single API call to Clerk to check license status
- Result cached locally (re-check every 24 hours)
- Clerk organization feature used for workspace sharing
- No user browsing data, knowledge data, or infrastructure data sent to Clerk

## Token Management
### Option A: Manual (default)
- Users enter API keys in Settings > Tokens
- Keys stored in OS keychain via Electron safeStorage
- Test connection on save

### Option B: Doppler
- Users connect Doppler project via service token
- Mixa pulls tokens from Doppler on launch
- Token mapping: Doppler secret name → Mixa token slot
- Refresh on demand or schedule

## Backup System
Users connect their own storage provider:

### Providers
| Provider | Auth Method | Storage Location |
|----------|------------|------------------|
| S3-compatible | Access key + secret | User's bucket |
| Dropbox | OAuth | /Apps/Mixa/ folder |
| Google Drive | OAuth | Mixa folder |
| Local directory | File picker | User-chosen path |

### Backup Format
- Encrypted ZIP (AES-256-GCM)
- User sets passphrase (never stored on our servers)
- Contents: PGlite dump, canvas files, settings, engine config
- Restore: select backup → enter passphrase → restore

### Schedule
- Manual: "Backup Now" button
- Automatic: daily or weekly (configurable)
- Backup history tracked locally
