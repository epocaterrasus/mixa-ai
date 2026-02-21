# Chunk 04 — Tab Types & Spaces

## Tab Types

### Web Tab
- Standard Chromium web page via Electron webContents
- Full browser features: history, cookies, dev tools
- Knowledge capture integration (Cmd+S to save page)
- Augmented browsing: related items indicator

### Terminal Tab
- Connected to Fenix Go engine via gRPC stream
- Renders UIView messages as React components (not ANSI)
- Interactive: click, hover, keyboard shortcuts forwarded as UIEvents
- Module selector to switch between engine modules
- Fallback: xterm.js for raw shell (bash/zsh via node-pty)

### Knowledge Tab
- Browse saved items in grid or list layout
- Search bar with hybrid search (semantic + full-text)
- Filters: tags, projects, item_type, date range, favorites
- Item detail view: full content, highlights, metadata
- Bulk actions: delete, move, tag

### Chat Tab
- RAG-based conversation interface
- Message input with markdown support
- Streaming AI responses with typing indicator
- Source citations as clickable chips
- Conversation history sidebar
- Scope selector (all, project, tags)

### Dashboard Tab
- Rich data visualizations
- Variants: Cost, Health, Knowledge Stats
- Charts (area, bar, pie), metrics, tables
- Data from Go engine (via gRPC) or PostgreSQL (via tRPC)

### Settings Tab
- Tabbed layout: AI Providers, Engine, Appearance, Shortcuts, Data
- API key management (OS keychain via Electron safeStorage)
- Theme selection, font settings
- Module enable/disable

## Spaces
- Named groups of tabs (like Arc browser)
- Examples: "Work", "Side Project", "Research"
- Tabs can be moved between spaces
- Space selector in sidebar
