# Chunk 14 — App Tabs, Canvas & Media Bar

## App Tabs (Isolated Web App Instances)

Electron session partitions enable running multiple instances of the same web app with separate auth.

### How It Works
```typescript
// Each App tab gets a unique partition
const partition = `persist:app-${appName}-${instanceId}`;
const ses = session.fromPartition(partition);
// This session has its own cookies, localStorage, IndexedDB
```

### Supported App Templates
| App | URL | Notes |
|-----|-----|-------|
| WhatsApp Web | web.whatsapp.com | Multiple accounts via separate partitions |
| Slack | app.slack.com | Multiple workspaces |
| Discord | discord.com/app | Multiple accounts |
| Gmail | mail.google.com | Multiple Google accounts |
| Google Meet | meet.google.com | With media bar integration |
| Notion | notion.so | Multiple workspaces |

### Session Persistence
- Partition data stored under `~/.mixa/data/partitions/{partition-name}/`
- Survives app restart (persist: prefix ensures this)
- User can clear partition data per app (Settings > Apps > Clear Data)

## Google Meet Media Bar

When a Google Meet tab (or App tab) is active:
- Media bar appears at top or bottom of browser chrome
- Shows: meeting name, duration, participant count
- Controls: mute mic, toggle camera, leave meeting
- Controls implemented via content script injection into Meet page
- Also detects any tab playing audio (audible indicator)

## Canvas (Visual Workspace + Whiteboard)

NOT just a drawing tool — a **visual workspace** where you embed live tabs, annotate, diagram.

### Core Concept
Think Excalidraw meets a mood board meets a spatial browser:
- Embed a browser tab INTO the canvas (drag from tab bar)
- Embedded tab renders as live webview or static screenshot
- Draw notes, arrows, diagrams AROUND the embedded tabs
- Create spatial layouts of research, architecture plans, project boards

### Implementation
- Base: `@excalidraw/excalidraw` React component (MIT license)
- Extended with custom elements: EmbeddedTab, StickyNote, ConnectorArrow
- Canvas JSON files stored in `~/.mixa/data/canvases/`
- Auto-save on every change (debounced 2 seconds)

### Embedded Tabs in Canvas
- Drag tab from tab bar → drops into canvas as embedded element
- Two modes:
  - **Live mode**: interactive webview (can scroll, click inside)
  - **Snapshot mode**: static screenshot with link back to URL
- Spatial zoom: zoom out to see full canvas, zoom into embedded tab to interact
- Resize embedded tabs within the canvas

### Features
- Freeform drawing, shapes, text, arrows (Excalidraw primitives)
- Sticky notes with rich text
- Connectors between any elements (tabs, notes, shapes)
- Export: PNG, SVG, Excalidraw JSON
- Canvas list in sidebar under "Canvases" section
- Theme-aware (dark/light)
- Canvas templates: architecture diagram, research board, project plan
- Shareable via workspace collaboration
