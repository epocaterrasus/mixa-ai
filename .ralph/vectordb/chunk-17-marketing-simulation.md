# Chunk 17 — Marketing Site with Real UI Simulation

## Approach (from fluffy-umbrella/Fintivio pattern)

The marketing site (`apps/web`) uses **actual product UI components** to create interactive demos, not screenshots or videos. Visitors see the real product working.

## Architecture

### Shared Components
- `packages/ui` contains all React components used by BOTH the desktop app and the marketing site
- Tab bar, sidebar, omnibar, terminal renderer, chat, canvas, knowledge view — all reusable
- Marketing site imports and renders these as demos

### BrowserMockup Wrapper
```tsx
// Component that wraps product UI in a fake browser chrome
function BrowserMockup({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border-b">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 bg-neutral-800 rounded px-3 py-1 text-xs text-neutral-400">
          {url}
        </div>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
```

### Demo Acts System
Declarative animation sequences that show product workflows:

```typescript
// Each "act" is a step in the demo
interface DemoAct {
  id: string;
  feature: string;           // Feature name shown in sidebar
  description: string;       // Feature description
  steps: DemoStep[];         // Animation steps
}

interface DemoStep {
  type: 'move-cursor' | 'click' | 'type' | 'drag' | 'wait' | 'scroll';
  target: string;            // data-w attribute on DOM element
  duration: number;          // milliseconds
  payload?: Record<string, unknown>;
}

// Example: "Capture a page" demo
const captureAct: DemoAct = {
  id: 'capture',
  feature: 'One-Click Capture',
  description: 'Save any page to your knowledge base instantly',
  steps: [
    { type: 'move-cursor', target: 'save-button', duration: 600 },
    { type: 'click', target: 'save-button', duration: 200 },
    { type: 'wait', target: '', duration: 500 },
    // Toast appears, content extracts, tags generate...
  ],
};
```

### Auto-Measurement
- DOM elements tagged with `data-w="element-id"` attributes
- `autoMeasureAnchors()` reads element positions at runtime
- Cursor animations use percentage-based coordinates (responsive)

### Demo Loop
- `runInterruptibleDemoLoop()`: plays acts in sequence, supports pause/resume/jump
- User clicking a feature card in the sidebar jumps to that act
- Infinite loop with configurable delay between acts

## Marketing Site Structure

```
apps/web/
├── app/
│   ├── page.tsx                    # Landing page (scroll-snap sections)
│   ├── pricing/page.tsx            # Pricing page
│   └── docs/                       # Documentation
├── components/
│   ├── sections/
│   │   ├── HeroSection.tsx         # Hero with BrowserMockup showing full app
│   │   ├── BrowsingSection.tsx     # Demo: web browsing + knowledge capture
│   │   ├── TerminalSection.tsx     # Demo: terminal renderer with COST/GUARD modules
│   │   ├── KnowledgeSection.tsx    # Demo: search + chat + RAG
│   │   ├── CanvasSection.tsx       # Demo: canvas with embedded tabs
│   │   ├── AppsSection.tsx         # Demo: WhatsApp/Meet app tabs
│   │   └── PricingSection.tsx      # Pricing cards
│   ├── demos/
│   │   ├── BrowserDemo.tsx         # Interactive browser demo composition
│   │   ├── TerminalDemo.tsx        # Interactive terminal demo
│   │   ├── ChatDemo.tsx            # Interactive chat demo
│   │   └── CanvasDemo.tsx          # Interactive canvas demo
│   └── shared/
│       ├── BrowserMockup.tsx       # Browser chrome wrapper
│       ├── AnimatedCursor.tsx      # Fake cursor for demos
│       └── FeatureCard.tsx         # Clickable feature descriptions
```

## Key Principle
The marketing site should make visitors feel like they're USING the product, not reading about it. Every feature section has a real interactive demo running actual product components.
