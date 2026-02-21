# Chunk 16 — Tab Management (from TabFlow) & UI Modes

## Tab Management Features

### Tab Groups
- Named groups with custom colors
- Collapse/expand groups in tab bar
- Auto-group by domain, project, or AI-detected topic
- Save group as template

### Sessions
- Save current tab set as named session
- Restore session from omnibar: "restore [session name]"
- Session includes: URLs, tab groups, scroll positions, App tab partitions
- Import sessions from Chrome bookmarks (optional)

### Forever History
- Every tab open/close event logged in PGlite
- Fields: URL, title, favicon, opened_at, closed_at, duration, referrer
- Searchable via omnibar with history scope
- "Recently closed" quick access (last 50 tabs)
- Full history browsable in Knowledge tab

### Tab Reminders
- Right-click tab → "Remind me" → pick time (1h, 3h, tomorrow, custom)
- Native OS notification at scheduled time
- Clicking notification opens the tab
- Reminder badge on tab in sidebar

### Tab Suspension
- Tabs inactive for >N minutes get suspended (configurable, default 30min)
- Suspended tabs release memory (webContents destroyed)
- Tab bar shows suspended indicator (dimmed)
- Click suspended tab → reload (URL preserved)
- Excluded domains: configurable list of never-suspend sites

### Quick Access Pins
- Pin frequently used sites/apps to top of sidebar
- Always visible, one-click access
- Drag to reorder
- Badge for unread counts (if detectable)

## Simple Mode / Power Mode

### Simple Mode (default for new users)
- 5 primary views in sidebar (not 10+)
- Text labels on ALL actions (not icon-only)
- Tab actions always visible (not hover-only)
- Larger click targets (44px+ for accessibility)
- Progressive disclosure: advanced features behind "More" dropdowns
- Control bar shows current state ("Grouped by: Sites")

### Power Mode
- All views visible
- Icon-only controls (compact)
- All features always visible
- Keyboard shortcuts for everything
- Advanced organization tools

### Mode Selection
- First launch: choose mode (with visual preview)
- Switch anytime in Settings > Appearance
- Smooth transition (no reload)

### UI Density (applies in both modes)
- Compact: smaller spacing, 32px row height
- Comfortable: default, 44px row height
- Spacious: generous spacing, 56px row height
