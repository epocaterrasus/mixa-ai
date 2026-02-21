# Chunk 05 — Knowledge Capture & Content Processing

## Capture Methods
1. **Page save** (Cmd+S): Full article extraction via Readability algorithm
2. **Text selection**: Right-click → "Save to Mixa" → saves as highlight-type item
3. **Code blocks**: Detected and saved with language information
4. **Auto-capture** (opt-in): Pages where user spends >N minutes
5. **Terminal capture**: Save command output from terminal tabs

## Content Processor Pipeline
```
Web Page → Readability Extract → Sanitize HTML → Generate Thumbnail → Store Item
                                                                      ↓
                                                        (async via BullMQ)
                                                                      ↓
                                              Chunk Text → Embed → Store Chunks
                                                                      ↓
                                              Summarize → Auto-Tag → Update Item
```

## packages/content-processor
- `extractors/article.ts` — @mozilla/readability for article extraction
- `extractors/code.ts` — Code block detection with language identification
- `extractors/youtube.ts` — YouTube transcript (Phase 2)
- `extractors/pdf.ts` — PDF text extraction (Phase 2)
- `sanitizer.ts` — Strip scripts, iframes, tracking pixels
- `thumbnail.ts` — Extract og:image or generate screenshot

## Storage
- Item metadata in `items` table
- Full content (HTML + text) in `items.content_html` / `items.content_text`
- Thumbnails in local filesystem (or S3)
- Duplicate detection by URL

## Augmented Browsing
- On every web page load (debounced 2s), extract title + description
- Search knowledge base for related items
- If found: show subtle indicator (badge/icon)
- Click indicator: panel with related saves
- Toggle on/off in settings
