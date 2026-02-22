# Mixa AI — Design & Experience PRD

> **Status:** Draft v1.0
> **Last updated:** 2026-02-22
> **Authors:** Edgar + AI Design Partner
> **Companion to:** `docs/prd/PRD.md` (functional requirements)

---

## 1. Design Philosophy: Ma (間)

### The Principle

Ma is the Japanese concept of negative space — the pause between notes in music, the emptiness in a room that gives it meaning. In Mixa, **the space between elements is as important as the elements themselves.**

This is not minimalism for minimalism's sake. It is functional clarity. Every pixel earns its place. What we remove matters as much as what we keep.

### Core Beliefs

**Content supremacy.** The UI chrome should feel invisible. When you're reading an article, browsing code, or reviewing costs — the content fills your attention, not the interface around it. Think of a Kindle: the device disappears, the words remain.

**Your house in the cyber world.** Your browser and terminal are where you live when you work. You want that space to feel calm, organized, and polished — like a room with tatami mats. Not cluttered with decorations. Not aggressively dark or blindingly bright. Just right, for hours at a time.

**The tree of knowledge.** Elon Musk's learning framework: understand the trunk (fundamentals) before the branches (details). Mixa's knowledge system mirrors this. Projects are not flat folders — they are trees. The trunk is your core research question. Branches are subtopics. Leaves are individual articles, notes, and snippets. The AI helps you see the shape of the tree.

**Interconnected neurons, not filing cabinets.** Knowledge items connect across projects. An article about database performance might be relevant to your "Mixa Architecture" project AND your "AWS Costs" project. Items are nodes in a graph, not files in a hierarchy.

---

## 2. Target Users

### Primary: All Builders

Mixa is for anyone who builds things and lives in a browser while doing it. Three primary archetypes, one shared need: **browse, capture, understand, build.**

#### The Vibe Coder

Indie developer building side projects. Researches constantly — frameworks, patterns, deployment strategies. Has 40 tabs open. Manages their own infrastructure. Wants one app instead of Chrome + iTerm + Notion + Vercel Dashboard + ChatGPT.

**Daily flow:** Research a topic → save useful pages → ask AI questions about what they saved → open terminal to deploy → check costs → repeat.

#### The Technical Entrepreneur

Researches markets, analyzes competitors, manages multiple ventures. Creates knowledge projects for each venture. Uses canvas to map out ideas visually. Needs to share research with co-founders.

**Daily flow:** Competitive research → create knowledge project → save competitor pages → annotate with notes → canvas for architecture/strategy mapping → export findings.

#### The Power Researcher

Consumes massive amounts of content weekly. Reads 20-50 articles. Needs semantic search across everything they've read. Builds deep understanding of topics over time.

**Daily flow:** Deep reading sessions → highlight and annotate → AI summarizes and connects ideas → revisit past research through chat → discover unexpected connections between topics.

---

## 3. Design System: Sumi & Washi

### 3.1 Color Palettes

Two palettes, both designed for long-duration comfort. No harsh contrasts, no blue-light heavy colors. Both should feel like reading a well-typeset book.

#### Sumi (墨) — Dark Mode

Named after Japanese ink. Warm charcoals instead of pure black. Text that doesn't burn your eyes at midnight.

| Token | Value | Purpose |
|-------|-------|---------|
| `bgBase` | `#1a1a1e` | App background — warm near-black |
| `bgSurface` | `#222226` | Cards, panels, elevated surfaces |
| `bgElevated` | `#2a2a2e` | Dropdowns, overlays, modals |
| `bgActive` | `#32323a` | Active/selected state |
| `bgHover` | `#28282e` | Hover state — subtle shift |
| `borderDefault` | `#2e2e34` | Primary borders — barely visible |
| `borderSubtle` | `#26262c` | Secondary borders — whisper-thin |
| `textPrimary` | `#e8e4df` | Body text — warm off-white |
| `textSecondary` | `#c4c0bb` | Secondary text |
| `textMuted` | `#8a8680` | Muted labels, timestamps |
| `textFaint` | `#4a4844` | Disabled, decorative |
| `accentPrimary` | `#8b8ec4` | Muted indigo — links, active states |
| `accentGreen` | `#7d9b85` | Success, health, uptime |
| `accentWarm` | `#c4956a` | Warnings, attention |
| `accentRed` | `#b87070` | Errors, critical — muted, not alarming |

#### Washi (和紙) — Light Mode

Named after Japanese handmade paper. Warm paper tones instead of clinical white. Comfortable for daylight reading.

| Token | Value | Purpose |
|-------|-------|---------|
| `bgBase` | `#f5f2ed` | App background — warm parchment |
| `bgSurface` | `#ebe7e1` | Cards, panels |
| `bgElevated` | `#ffffff` | Dropdowns, overlays — crisp white |
| `bgActive` | `#e0dbd4` | Active/selected |
| `bgHover` | `#eee9e3` | Hover state |
| `borderDefault` | `#ddd8d2` | Primary borders — warm gray |
| `borderSubtle` | `#e8e3dd` | Secondary borders |
| `textPrimary` | `#2c2a27` | Body text — warm near-black |
| `textSecondary` | `#5c5955` | Secondary text |
| `textMuted` | `#8a8580` | Muted labels |
| `textFaint` | `#c4bfb9` | Disabled, decorative |
| `accentPrimary` | `#5c5f99` | Deeper indigo for light backgrounds |
| `accentGreen` | `#4a7a55` | Success |
| `accentWarm` | `#a07040` | Warnings |
| `accentRed` | `#995555` | Errors |

### 3.2 Typography

Content-first typography. Generous line-height for readability. Light weights for calm, heavier weights only for emphasis.

| Token | Value | Notes |
|-------|-------|-------|
| `fontSans` | `'Inter', -apple-system, sans-serif` | UI text. Inter for its neutrality. |
| `fontMono` | `'JetBrains Mono', 'SF Mono', monospace` | Code, terminal, data |
| `textBase` | `14px` | Base font size (up from 13px) |
| `textSm` | `12px` | Small labels, metadata |
| `textXs` | `11px` | Timestamps, badges |
| `textLg` | `16px` | Section headers |
| `textXl` | `20px` | Page titles |
| `lineHeightBody` | `1.6` | Body text — generous breathing |
| `lineHeightTight` | `1.3` | Compact elements (tab bar, lists) |
| `weightNormal` | `400` | Default text |
| `weightMedium` | `500` | Emphasis, labels |
| `weightSemibold` | `600` | Headers only — used sparingly |

### 3.3 Spacing (Ma Scale)

More breathing room than typical dev tools. Whitespace replaces borders where possible.

| Token | Value | Usage |
|-------|-------|-------|
| `space1` | `4px` | Tight internal padding |
| `space2` | `8px` | Between related elements |
| `space3` | `12px` | Standard padding inside components |
| `space4` | `16px` | Between components |
| `space6` | `24px` | Between sections |
| `space8` | `32px` | Major section gaps |
| `space12` | `48px` | Page-level breathing room |

**Design rule:** Prefer `space6` or `space8` between sections. Never stack components tighter than `space3`. When in doubt, add more space.

### 3.4 Icons: Lucide

Replace all emoji/unicode characters with [Lucide](https://lucide.dev) icons. Thin-line, consistent stroke width, neutral aesthetic.

**Implementation:** Centralized `Icon` component in `packages/ui/src/icons/`. Single source of truth. Components import `<Icon name="terminal" />`, never raw SVG or emoji.

**Icon map (complete registry):**

| Context | Name | Lucide Icon |
|---------|------|-------------|
| Tab: Web | `web` | `Globe` |
| Tab: App | `app` | `AppWindow` |
| Tab: Terminal | `terminal` | `Terminal` |
| Tab: Knowledge | `knowledge` | `BookOpen` |
| Tab: Chat | `chat` | `MessageCircle` |
| Tab: Dashboard | `dashboard` | `BarChart3` |
| Tab: Settings | `settings` | `Settings` |
| Tab: Canvas | `canvas` | `PenTool` |
| Nav: Back | `back` | `ChevronLeft` |
| Nav: Forward | `forward` | `ChevronRight` |
| Nav: Reload | `reload` | `RotateCw` |
| Nav: Stop | `stop` | `X` |
| Action: Close | `close` | `X` |
| Action: Save/Capture | `capture` | `Download` |
| Action: Search | `search` | `Search` |
| Action: Add | `add` | `Plus` |
| Action: Favorite | `favorite` | `Star` |
| Action: Archive | `archive` | `Archive` |
| Action: Delete | `delete` | `Trash2` |
| Action: Filter | `filter` | `SlidersHorizontal` |
| Action: Sort | `sort` | `ArrowUpDown` |
| Action: Export | `export` | `Share` |
| Action: Copy | `copy` | `Copy` |
| Item: Article | `article` | `FileText` |
| Item: Highlight | `highlight` | `Highlighter` |
| Item: Code | `code` | `Code` |
| Item: PDF | `pdf` | `FileText` |
| Item: YouTube | `youtube` | `Play` |
| Item: Image | `image` | `Image` |
| Status: Lock/HTTPS | `lock` | `Lock` |
| Status: Loading | `loading` | `Loader` |
| Status: Success | `success` | `Check` |
| Status: Error | `error` | `AlertCircle` |
| Status: Warning | `warning` | `AlertTriangle` |
| Engine: GUARD | `guard` | `Shield` |
| Engine: FORGE | `forge` | `GitBranch` |
| Engine: COST | `cost` | `DollarSign` |
| Engine: PULSE | `pulse` | `Activity` |
| Engine: KEYS | `keys` | `Keyboard` |
| Sidebar: Collapse | `collapse` | `PanelLeftClose` |
| Sidebar: Expand | `expand` | `PanelLeftOpen` |

### 3.5 Borders and Separators

**Design rule:** Prefer whitespace over borders. Use borders only when spatial separation alone is insufficient (e.g., sidebar edge, panel dividers). When borders are used, they should be `borderSubtle` — barely visible, never prominent.

**No double-borders.** Never place two bordered elements adjacent. One border between them, or whitespace.

### 3.6 Shadows

Minimal shadows. Used only for overlays (dropdowns, modals, command palette) to indicate elevation.

- `shadowFloat`: `0 2px 8px rgba(0,0,0,0.08)` (light) / `rgba(0,0,0,0.3)` (dark)
- `shadowOverlay`: `0 8px 24px rgba(0,0,0,0.12)` (light) / `rgba(0,0,0,0.5)` (dark)

No shadows on cards, panels, or static elements.

### 3.7 Animation and Motion

**Principle:** Motion should be felt, not seen. No bouncing, no sliding panels, no attention-seeking transitions.

- **Opacity fades:** 150ms for show/hide (tooltips, dropdowns)
- **Color transitions:** 100ms for hover states
- **Layout shifts:** None. Content should never jump.
- **Loading states:** Subtle pulsing opacity (not spinners) for content loading. Thin progress bar for page loading.

---

## 4. Sidebar Chat: Always Available AI

### 4.1 Architecture

The chat is a single system with two presentation modes:

```
                  ┌─────────────────────┐
                  │     Chat System      │
                  │                      │
                  │  Conversations[]     │
                  │  Active Model        │
                  │  Permissions         │
                  │  System Prompt       │
                  └──────┬──────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
     ┌────────▼────────┐  ┌────────▼────────┐
     │  Sidebar View   │  │  Full Tab View  │
     │                 │  │                 │
     │  Compact        │  │  Expanded       │
     │  Always visible │  │  Full height    │
     │  300px width    │  │  Conversation   │
     │  Quick input    │  │  history sidebar│
     │                 │  │  Rich citations │
     └─────────────────┘  └─────────────────┘
```

Both views share the same conversation state. Opening the full Chat tab simply expands the sidebar chat. Switching back preserves context.

### 4.2 Sidebar Chat UX

The sidebar chat is always accessible — a small icon at the bottom of the sidebar. Clicking it opens a compact chat panel.

**Chat header (always visible when open):**
- Model selector dropdown (e.g., "GPT-4o-mini") — per-conversation, inherits user's default
- Browser context toggle: small icon that shows whether chat can see the current tab
- Expand button: opens conversation as full Chat tab

**Browser context approval:**
When the user toggles browser context ON, or when the AI wants to reference the current page:
- A subtle inline notice appears: "Chat can see: *Article Title — domain.com*" with a small X to revoke
- Non-modal, non-blocking, appears at the top of the chat panel
- If the user asks "what's this page about?" without context enabled, the chat responds: "I don't have access to your current tab. [Grant access]" — one click to enable

### 4.3 AI Personality and Configuration

The AI personality is configurable via a system prompt field in Settings > AI Providers > System Prompt.

Defaults:
- **Minimal mode** (matches Ma aesthetic): concise answers, no filler, cites sources precisely
- **Assistant mode**: proactive suggestions, "you might also want to check..."
- **Custom**: user writes their own system prompt

The system prompt is prepended to every conversation.

### 4.4 AI Capabilities (Full Agent)

The chat AI can:

| Capability | How it works |
|-----------|-------------|
| **Search knowledge base** | Hybrid vector + full-text search across saved items |
| **Read current tab** | When browser context is enabled, extracts and reads page content |
| **Browse the web** | Opens tabs in the background, extracts content, summarizes findings |
| **Save pages** | Captures pages to the knowledge base on the user's behalf |
| **Organize knowledge** | Tag items, move to projects, suggest connections |
| **Run terminal commands** | Execute commands via the Fenix engine (GUARD, FORGE, etc.) |
| **Create canvas notes** | Add items to a canvas/project board |

**Transparency:** When the AI takes actions, they appear as discrete events in the chat:
```
> Opened: https://nextjs.org/blog/next-15 (scanning...)
> Saved: "Next.js 15 Release Notes" to Knowledge Base
> Found 3 related items in your knowledge base
```

The user can click any action to see details or undo it.

---

## 5. Knowledge Projects: The Tree Model

### 5.1 Concept

A knowledge project is a **workspace** around a topic. Not a folder of links. A living, interconnected collection of:

- Saved web pages and articles
- Highlighted text and annotations
- Notes (freeform text)
- Canvas drawings and diagrams
- A dedicated chat thread scoped to the project's content
- AI-generated summary of the project

### 5.2 Tree Visualization

```
        ┌─ Article: "Postgres vs MySQL for SaaS"
    ┌───┤
    │   └─ Highlight: "pgvector enables..."
    │
    │   ┌─ Article: "PGlite: Postgres in WASM"
Database ─┤
    │   └─ Note: "Could eliminate Docker dep"
    │
    │   ┌─ Canvas: Architecture Diagram
    └───┤
        └─ Chat thread: "Best embedding storage?"
```

The tree is the primary navigation within a project. Trunk is the project name/topic. Branches are subtopics (AI-suggested or user-created). Leaves are individual items.

### 5.3 Cross-Project Connections

Items can belong to multiple projects. When an item is relevant to multiple projects, it appears as a node with connections:

- "Database Performance" article appears in both "Mixa Architecture" and "AWS Optimization" projects
- The AI suggests connections: "This article about caching might be relevant to your Infrastructure project"
- A graph view shows all items and their project memberships (future: interactive force-directed graph)

### 5.4 Project Sharing

Phase 1 (current scope):
- **Export as package**: Markdown bundle, PDF, or Obsidian-compatible vault
- **Export includes**: all items, notes, canvas snapshots, AI summary

Phase 2 (future):
- Share via link (read-only viewing)
- Collaborative projects (real-time editing)

---

## 6. Agentic AI Browsing

### 6.1 How It Works

When the user asks the AI to research something:

1. User: "Research the latest Next.js 15 changes and summarize them"
2. AI acknowledges and begins:
   - Opens a background browser tab
   - Navigates to relevant URLs (search results, official docs)
   - Extracts content from each page
   - Closes background tabs
3. AI presents findings with citations:
   - "Based on the Next.js 15 release notes [1] and the migration guide [2]..."
   - Each citation links to the source URL
4. Optional: "Save these to your knowledge base?" — one-click capture of all researched pages

### 6.2 Permissions Model

Default: Full agent capabilities enabled.

User can restrict per conversation:
- "No browsing" — chat only uses existing knowledge base
- "No saving" — chat can browse but doesn't save anything
- "Read-only" — chat can search knowledge and read current tab, nothing else

Global defaults configurable in Settings > AI > Agent Permissions.

### 6.3 Transparency

Every agent action appears as a collapsible event in the chat:

```
[Browsing] Searched: "Next.js 15 features"
  ├─ Opened: nextjs.org/blog/next-15 (2.3s)
  ├─ Opened: github.com/vercel/next.js/releases (1.8s)
  └─ Opened: blog.vercel.com/next-15-migration (1.5s)

Based on my research, here are the key changes in Next.js 15...
```

Actions are collapsed by default (just a one-line summary). Click to expand details.

---

## 7. Command Discovery

### 7.1 Unified Command Registry

A single registry that powers all command discovery surfaces:

```
Command Registry (stores/commands.ts)
  │
  ├─ Electron commands (tab management, navigation, capture)
  ├─ Engine commands (GUARD, FORGE, COST, PULSE, KEYS)
  ├─ AI commands (chat, search knowledge, browse)
  ├─ Detected CLI tools (doppler, claude, gh, aws)
  └─ User-defined commands (custom shortcuts, bookmarklets)
```

Each command has:
- `id`: unique identifier
- `label`: human-readable name
- `shortcut`: keyboard shortcut (if any)
- `icon`: Lucide icon name
- `category`: grouping for display
- `action`: what it does
- `available`: whether it's currently available (e.g., "Go Back" unavailable if no history)

### 7.2 Command Palette (Cmd+K)

The omnibar in command mode. Activated by `Cmd+K` or typing `>` in the omnibar.

**What it shows:**
- All available commands, grouped by category
- Keyboard shortcuts displayed inline
- Recently used commands at the top
- Fuzzy search across command labels and descriptions
- Detected CLI tools: "Open Doppler", "Run Claude Code", "GitHub CLI"

**Design:** Full-width dropdown below the omnibar. Clean list with icon + label + shortcut. No categories visible by default (just a flat, searchable list). Categories appear if the user scrolls or types a category prefix.

### 7.3 Slash Commands in Chat

Typing `/` at the start of a chat message shows available commands:

| Command | Description |
|---------|-------------|
| `/search [query]` | Search knowledge base without AI generation |
| `/scope [project]` | Limit this conversation to a specific project |
| `/browse [url]` | Have the AI read and summarize a URL |
| `/save` | Save the AI's last response as a note |
| `/clear` | Clear conversation history |
| `/model [name]` | Switch model for this conversation |
| `/system [prompt]` | Override system prompt for this conversation |
| `/help` | Show all available commands |

Slash commands appear as a compact autocomplete dropdown. Typing filters the list.

### 7.4 Shortcut Quick-Reference

`Cmd+?` (or `Cmd+/`) opens a modal overlay showing all keyboard shortcuts, grouped by category:

- **Tabs**: New, Close, Switch, Reorder
- **Navigation**: Back, Forward, Reload, Stop
- **Capture**: Save Page, Save Selection
- **Chat**: Open Sidebar Chat, Focus Input
- **Terminal**: Open Terminal, Open Shell
- **General**: Command Palette, Settings, Toggle Sidebar

Overlay uses the Ma aesthetic: clean typography, generous spacing, no decorative elements. Dismiss with Escape or clicking outside.

### 7.5 CLI Tool Detection

On app startup, Mixa checks PATH for known CLI tools:

| Tool | Check | Command Palette Entry |
|------|-------|----------------------|
| `doppler` | `which doppler` | "Doppler: Manage Secrets" |
| `claude` | `which claude` | "Claude Code: Open Session" |
| `gh` | `which gh` | "GitHub CLI: Open" |
| `aws` | `which aws` | "AWS CLI: Open" |
| `docker` | `which docker` | "Docker: Open" |
| `kubectl` | `which kubectl` | "Kubernetes: Open" |

Detected tools appear in `Cmd+K` palette and can be launched in a new Shell tab.

---

## 8. First Experience & Onboarding

### 8.1 First Launch

When Mixa opens for the first time:

1. **Welcome screen** — clean, minimal. Mixa logo. One sentence: "Your browser, your knowledge, one place."
2. **Choose your path** (optional):
   - "I'm a Developer" — emphasizes terminal, Git, infrastructure modules
   - "I'm a Researcher" — emphasizes knowledge capture, search, AI chat
   - "I'm an Entrepreneur" — emphasizes knowledge projects, canvas, competitive research
   - "I'll explore on my own" — skips to app with a few tooltip hints
3. **Guided tour** (if chosen):
   - Tailored to selected path
   - 4-5 screens showing key features relevant to that path
   - Interactive: "Try saving this page" (opens a sample URL)
4. **Starter templates**:
   - Every user gets a "Getting Started" knowledge project pre-loaded
   - Contains: a few saved articles about Mixa's features, a sample canvas, a chat thread demonstrating RAG

### 8.2 Progressive Disclosure

After onboarding, the app uses progressive disclosure to reveal features:

- **Empty states** always include helpful guidance: "No saved pages yet. Press Cmd+S on any web page to capture it."
- **Tooltip hints** on first use of key features (dismissible, never repeated)
- **"Did you know?"** subtle prompts in the sidebar (configurable, opt-out)
- **Help accessible everywhere**: `?` icon in every panel header links to relevant docs

### 8.3 Documentation

Comprehensive in-app docs accessible via:
- `Cmd+K` → "Open Documentation"
- Settings > About > Documentation
- Help icon in any panel header
- Chat: "How do I save a page?" → AI answers with app-specific instructions

---

## 9. Interaction Patterns

### 9.1 Spatial Consistency

Same action, same position, always:
- **Close** is always top-right of any panel/overlay
- **Navigation** (back/forward) is always top-left of the toolbar
- **Primary action** is always bottom-right of any form/dialog
- **Search** is always top-center (omnibar) or top of a list view

### 9.2 Feedback Without Noise

- **No toast notifications** for routine actions (save, capture, delete). Use inline confirmation: the save button briefly shows a checkmark, then returns to normal.
- **Toast only for exceptional events**: errors, background task completion (embedding done), update available.
- **Toasts are minimal**: one line, bottom-right, auto-dismiss in 3 seconds, no icons.

### 9.3 Progressive Complexity

Two UI modes (from PRD: MIXA-048):

**Simple Mode:**
- 5 primary sidebar items: Browse, Knowledge, Chat, Terminal, Settings
- Text labels on all buttons (no icon-only)
- Larger click targets (44px minimum)
- Advanced features behind "More" menus
- Default for new users

**Power Mode:**
- All sidebar items visible (dashboards, canvases, projects)
- Icon-only controls for density
- Compact layout
- All features immediately accessible
- Default for returning users who toggle it

### 9.4 Content-First Rendering

When a web page is loading:
- Tab bar remains minimal (favicon + title only, no extra controls)
- Toolbar shows a thin progress line (2px, accent color) — not a chunky loading bar
- Once loaded, the toolbar shows URL and navigation. Nothing else demands attention.

In full-screen or focused reading mode (future):
- Tab bar collapses to just the active tab title
- Toolbar hides entirely
- Sidebar collapses
- Content fills the screen

---

## 10. Business Model

### Open Core

- **Free (open source)**: Full browser, terminal, knowledge capture, AI chat (BYOK), all engine modules, canvas, single-user everything
- **Pro ($12/mo)**: Unlimited knowledge items (free: 500), priority support, advanced export formats, scheduled backups
- **Team ($24/mo/seat)**: Shared knowledge projects, collaborative canvases, workspace invites, audit trail, SSO

**Principle:** The open source version is a complete, fully functional product. Pro adds convenience and scale. Team adds collaboration. Nobody is forced to pay to use Mixa for their own work.

---

## 11. Open Questions

### Resolved in This PRD

- **Q: How should the chat access browser context?** A: Opt-in toggle per conversation, non-invasive approval flow
- **Q: Should the AI be agentic?** A: Yes, full agent by default with user-controllable restrictions
- **Q: Emoji or icon library?** A: Lucide icons, centralized registry
- **Q: Folder or graph for knowledge?** A: Tree model with cross-project connections

### Still Open

- **Q: Real-time collaboration timeline.** Workspace sharing (Clerk) is in the PRD but collaborative editing is complex. Define scope for v1 vs v2.
- **Q: Mobile companion app.** Read-only knowledge browser? Chat-only? Full mirror? Define scope.
- **Q: Plugin/extension marketplace.** The Go engine supports plugins via go-plugin. When do we open this to the community?
- **Q: Offline AI.** Ollama support exists for local models. How prominent should this be in onboarding?
- **Q: Canvas depth.** Current Excalidraw integration is drawing-only. How deep should the "embed browser tabs in canvas" feature go?

---

## 12. Implementation Priority

This design PRD layers onto the existing functional PRD. Implementation order:

| Phase | What | Why |
|-------|------|-----|
| **D-0** | PGlite migration (MIXA-046) | Nothing persists without this. Critical blocker. |
| **D-1** | Icon system (Lucide) + color palettes (Sumi/Washi) | Instant visual transformation. Mechanical but high-impact. |
| **D-2** | Spacing, typography, border reduction | Completes the Ma aesthetic. |
| **D-3** | Sidebar chat + browser context toggle | Core interaction model change. |
| **D-4** | Command registry + Cmd+K improvements | Discoverability. |
| **D-5** | Knowledge projects (tree model) | Deep feature, builds on PGlite. |
| **D-6** | Agentic AI browsing | Requires chat to be wired to RAG first. |
| **D-7** | Slash commands, CLI detection, shortcut overlay | Polish. |
| **D-8** | Onboarding redesign | After features stabilize. |

---

## Appendix A: Design Audit of Current State

What Ralph built (41/51 tasks) and what needs to change:

| Area | Current State | Design PRD Target |
|------|--------------|-------------------|
| Colors | High-contrast black (#0a0a0a) / white (#f8f8f8) | Warm Sumi / Washi palettes |
| Icons | 50+ emoji characters across 20+ files | Lucide icons, centralized registry |
| Typography | 13px base, tight spacing | 14px base, 1.6 line-height, lighter weights |
| Spacing | Dense dev-tool style | Ma-inspired generous whitespace |
| Borders | Heavy use of visible borders | Whitespace separation, whisper-thin borders |
| Chat | Full tab only, placeholder RAG | Sidebar + tab, wired RAG, agentic browsing |
| Knowledge | Flat list/grid with tag filters | Tree-model projects with cross-connections |
| Commands | Hardcoded in Omnibar, 12 commands | Unified registry, engine integration, CLI detection |
| Onboarding | 5-step wizard, one path | Choose-your-path with templates |
| AI context | No browser awareness | Opt-in current tab context with easy approval |
| Model selection | Global only (Settings) | Per-conversation with configurable default |
| Persistence | In-memory only | PGlite (must be done first) |

## Appendix B: Color Token Reference (CSS Variables)

All tokens are exposed as CSS custom properties under the `--mixa-` prefix:

```css
/* Sumi (Dark) */
--mixa-bg-base: #1a1a1e;
--mixa-bg-surface: #222226;
--mixa-bg-elevated: #2a2a2e;
--mixa-text-primary: #e8e4df;
--mixa-text-secondary: #c4c0bb;
--mixa-accent-primary: #8b8ec4;

/* Washi (Light) */
--mixa-bg-base: #f5f2ed;
--mixa-bg-surface: #ebe7e1;
--mixa-bg-elevated: #ffffff;
--mixa-text-primary: #2c2a27;
--mixa-text-secondary: #5c5955;
--mixa-accent-primary: #5c5f99;
```
