# Chunk 02 — Database Schema

## Tables (PostgreSQL 16 + pgvector)

### users
- id (UUID PK), email (TEXT UNIQUE), display_name, settings (JSONB), created_at, updated_at

### items (saved knowledge)
- id (UUID PK), user_id (FK users), url, title, description, content_text, content_html
- item_type: 'article' | 'highlight' | 'youtube' | 'pdf' | 'code' | 'image' | 'terminal'
- source_type: 'manual' | 'auto_capture' | 'extension' | 'terminal'
- thumbnail_url, favicon_url, domain, word_count, reading_time
- summary (AI-generated), is_archived, is_favorite, captured_at, created_at, updated_at

### chunks (text chunks with embeddings for RAG)
- id (UUID PK), item_id (FK items CASCADE), chunk_index (INT), content (TEXT)
- token_count (INT), embedding (vector(1536)), created_at

### tags
- id (UUID PK), name (TEXT UNIQUE), color (TEXT)

### item_tags
- item_id (FK items CASCADE), tag_id (FK tags CASCADE), score (REAL), PK(item_id, tag_id)

### projects (knowledge collections)
- id (UUID PK), user_id (FK users), name, description, icon, color, is_default, created_at, updated_at

### item_projects
- item_id (FK items CASCADE), project_id (FK projects CASCADE), PK(item_id, project_id)

### highlights
- id (UUID PK), item_id (FK items CASCADE), text, note, color, selector_data (JSONB), created_at

### conversations
- id (UUID PK), user_id (FK users), title, scope (JSONB), created_at, updated_at

### messages
- id (UUID PK), conversation_id (FK conversations CASCADE), role ('user'|'assistant')
- content (TEXT), citations (JSONB), model_used, token_count, created_at

## Key Indexes
- idx_items_user (user_id), idx_items_type (item_type), idx_items_domain (domain)
- idx_items_captured (captured_at DESC)
- idx_chunks_item (item_id)
- idx_chunks_embedding USING ivfflat (embedding vector_cosine_ops)
- idx_items_fulltext USING gin(to_tsvector('english', title || content_text))
