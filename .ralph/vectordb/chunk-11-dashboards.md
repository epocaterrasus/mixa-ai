# Chunk 11 — Dashboard Tabs

Dashboard tabs render rich data visualizations. They get data from the Go engine (via gRPC) or PostgreSQL (via tRPC).

## Cost Dashboard
- Total monthly spend metric card with trend
- Per-provider breakdown (pie/donut chart)
- Daily cost accumulation (area chart)
- Budget utilization bars (green < 80%, yellow 80-90%, red > 90%)
- Month-over-month comparison
- Per-service table (sortable, filterable)
- Budget limit editing (slider + input)

## Health Dashboard
- Uptime grid: green/yellow/red squares per endpoint per day
- Response time chart: line with p50/p95/p99
- SSL certificate expiry table with countdown badges
- Incident timeline: chronological up/down events
- Endpoint management (add/edit/remove)
- Quick actions: Test Now, Acknowledge Incident

## Knowledge Stats Dashboard
- Total items count with trend
- Items captured per day/week (bar chart)
- Top tags (word cloud or bar)
- Most saved domains (top 10)
- Reading time estimates
- Recent captures feed (last 10)

## Technical Notes
- Charts use recharts (React charting library)
- Theme-aware color palettes
- Responsive layout (works in split view)
- Loading skeletons for data fetching
- Empty states with helpful messages
- Data refresh: pull on tab focus, or configurable polling interval
