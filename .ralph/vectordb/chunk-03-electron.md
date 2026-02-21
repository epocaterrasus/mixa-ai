# Chunk 03 — Electron Browser Shell

## Architecture
- Electron 33+ with Chromium
- Main process: window management, IPC, tRPC router, engine lifecycle, system tray
- Renderer process: React app (browser chrome, tabs, sidebar, omnibar)
- Preload scripts: contextBridge for safe IPC

## Security Requirements (Non-Negotiable)
- nodeIntegration: false
- contextIsolation: true
- sandbox: true for webviews
- webSecurity: true
- All IPC via contextBridge (never expose Node.js APIs to renderer)

## Window Structure
```
┌─ Title Bar ──────────────────────────────────────────┐
│ ← → ↻  [═══════ Omnibar ═══════]  [Engine ●]       │
├─ Tab Bar ────────────────────────────────────────────┤
│ [Tab 1] [Tab 2] [Tab 3] [+]                          │
├──────┬───────────────────────────────────────────────┤
│      │                                                │
│  S   │           Tab Content Area                     │
│  i   │                                                │
│  d   │    (Web page / Terminal / Knowledge / Chat)    │
│  e   │                                                │
│  b   │                                                │
│  a   │                                                │
│  r   │                                                │
│      │                                                │
├──────┴───────────────────────────────────────────────┤
│ Status Bar                                            │
└──────────────────────────────────────────────────────┘
```

## Tab Management
- Zustand store for tab state
- Each tab has: id, type (TabType), title, url?, isActive, isLoading, favicon?
- Web tabs use Electron webContents (one per tab)
- Non-web tabs render React components in a shared content area
- Tab suspension for inactive tabs (memory optimization)

## Keyboard Shortcuts (Browser Standard)
- Cmd+T: New tab
- Cmd+W: Close tab
- Cmd+1-9: Switch to tab N
- Cmd+L: Focus omnibar
- Cmd+K: Command palette mode
- Cmd+[/]: Back/Forward
- Cmd+R: Reload
- Cmd+F: Find in page
- Cmd+B: Toggle sidebar
