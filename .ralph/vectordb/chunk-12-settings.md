# Chunk 12 — Settings & Theming

## Settings Tab Layout

Tabbed/sectioned layout with sections:

### AI Providers
- Provider cards: OpenAI, Anthropic, Gemini, Ollama
- Each card: API key input (masked), model selector, test connection button
- Active provider indicator
- API keys stored in Electron safeStorage (OS keychain)

### Engine Modules
- List of all Fenix engine modules
- Enable/disable toggle per module
- Module status indicator (running, stopped, error)
- Module-specific settings (expandable)

### Appearance
- Theme selector: Dark (default), Light, System
- Accent color: 10 presets + custom hex
- Font family and size
- Sidebar position (left/right)
- Tab bar position (top/bottom)
- Compact mode toggle

### Keyboard Shortcuts
- Searchable list of all shortcuts
- Click to rebind (press new key combination)
- Conflict detection (highlight conflicting shortcuts)
- Reset to defaults button
- Import/export shortcut config

### Data Management
- Storage usage (knowledge items, embeddings, cache)
- Export all data: Markdown, JSON, Obsidian format
- Clear embedding cache
- Clear browsing history
- Delete all knowledge items (with confirmation)

## Theming System
- CSS variables for all theme tokens
- Tokens: colors (bg, fg, accent, muted, border), spacing, typography, radii
- Applied globally via Tailwind CSS theme extension
- Terminal renderer components use same theme tokens
- Dashboard charts use theme-aware color arrays
- Theme switching is instant (no flash, CSS variable swap)
