# Voltaris architecture and shared contracts

## Repository layout

```text
apps/command/      Next.js Command product
apps/margin/       Next.js Margin product
packages/core/     Shared database client, domain types, AI adapter, metric functions
database/          SQL migrations, synthetic company data, reviewer shift overlay
docs/              Architecture, operations, case studies
```

Two Next.js applications are independently deployable on Vercel. Both use the same Neon PostgreSQL database and the same `@voltaris/core` package. Server-side code owns all database and Gemini API calls. Browser code never receives credentials.

An invited account owns one `sandbox_*` schema. The signed session carries that schema, and the server confirms its owner and expiry in `public.reviewer_workspaces` on each business request. Every business query or transaction uses `SET LOCAL search_path` with that single schema, so the Neon pooler can be used and missing sandbox tables cannot resolve to public tables. Account records and daily AI-call counters remain in `public`. Shared showcase staff default to `public`; the manager role remains read-only in Command.

## Shared domain vocabulary

- `sites`: customer locations and regions.
- `assets`: EV chargers and other serviceable equipment at a site.
- `incidents`: reported faults; one incident belongs to an asset.
- `maintenance_logs`: dated history for an asset.
- `knowledge_documents` and `knowledge_chunks`: cited maintenance guidance.
- `technicians`, `technician_skills`, `availability_slots`: dispatch candidates.
- `contracts`: service level and pricing context.
- `work_orders`: proposed, approved, scheduled, in-progress, and completed jobs.
- `approvals` and `agent_actions`: accountable human decisions and AI activity.
- `financial_events`: recognized revenue, actual cost, forecast revenue, or forecast cost; always classified explicitly.

## Product boundaries

Command may call typed, allowlisted operations for retrieval, incident lookup, dispatch checks, proposal creation, and approval. Gemini returns a structured set of cause and check claims, each with its own exact retrieved source IDs. Claims with invalid IDs are discarded. A model suggestion does not write a work order or booking without a human approval action. The system persists the approved action in a transaction and prevents duplicate slot bookings.

Margin reads structured operational and financial data. It computes metrics in SQL or deterministic TypeScript, then sends only computed evidence to Gemini for explanation. It may choose from allowlisted analyses; it may not execute free-form model SQL. `recognized_revenue - actual_cost` defines actual service margin; forecasts are separate.

## Release and tracing

CI creates a disposable pgvector-backed database and two isolated reviewer schemas, runs typechecks, tests, builds, cross-workspace and accounting checks, and a Playwright reviewer journey. Structured logs carry a request trace ID through an app and the shared database/AI layer. Persisted incident and work-order IDs connect Command state to Margin's forecast and actual records. Logs omit prompts, SQL values, and credentials; `scripts/reliability-summary.mjs` calculates counts and latency percentiles from exported NDJSON logs.
