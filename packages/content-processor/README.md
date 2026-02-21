# @mixa-ai/content-processor

Web content extraction library for capturing articles, code blocks, and metadata from HTML pages.

## Architecture

```
src/
├── extractors/
│   ├── article.ts     # Article extraction (Mozilla Readability)
│   ├── code.ts        # Code block extraction with language detection
│   └── index.ts
├── sanitizer.ts       # HTML sanitization (removes scripts, trackers)
├── thumbnail.ts       # Thumbnail extraction (og:image, img tags)
└── index.ts
```

## Extractors

### Article Extraction

Uses Mozilla Readability + JSDOM to extract article content from web pages.

```typescript
import { extractArticle } from '@mixa-ai/content-processor';

const result = extractArticle(htmlString, 'https://example.com/article');
// Returns: {
//   title, author, content (sanitized HTML), textContent (plain text),
//   excerpt, siteName, wordCount, readingTime (minutes)
// }
// Returns null if Readability cannot parse the page
```

Reading time is calculated at 200 words per minute (minimum 1 minute).

### Code Block Extraction

Extracts `<pre><code>` blocks from HTML with optional language detection from CSS class names.

```typescript
import { extractCodeBlocks } from '@mixa-ai/content-processor';

const blocks = extractCodeBlocks(htmlString);
// Returns: CodeBlock[] with { code, language? }
```

## HTML Sanitizer

Removes potentially dangerous or unwanted elements from HTML:

- **Removed elements**: `script`, `noscript`, `style`, `iframe`, `object`, `embed`, `applet`, `form`, `link`
- **Removed tracking pixels**: 1x1 and 0x0 images
- **Removed attributes**: `on*` event handlers (onclick, onload, etc.)
- **Removed URI schemes**: `javascript:`, `vbscript:`, `data:` on href/src/action attributes

```typescript
import { sanitizeHtml } from '@mixa-ai/content-processor';

const safe = sanitizeHtml(untrustedHtml);
```

## Thumbnail Extraction

Finds a thumbnail image from the page:

1. Checks `og:image` meta tag (preferred)
2. Falls back to the first suitable `<img>` tag

```typescript
import { extractThumbnail } from '@mixa-ai/content-processor';

const thumb = extractThumbnail(htmlString, 'https://example.com');
// Returns: { url, width?, height?, alt? } or null
```

## Testing

```bash
pnpm test         # Run tests (HTML fixture-based)
pnpm typecheck    # Type check
pnpm build        # Build
```

## Dependencies

- `@mozilla/readability` — article content extraction
- `jsdom` — HTML parsing in Node.js
- `turndown` — HTML to Markdown conversion
