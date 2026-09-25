# Voltaris architecture and shared contracts

## Repository layout

```text
apps/command/      Next.js Command product
apps/margin/       Next.js Margin product
packages/core/     Shared database client, domain types, AI adapter, metric functions
database/          SQL migrations and synthetic seed data
docs/              Architecture, operations, case studies
```

Two Next.js applications are independently deployable on Vercel. Both use the same Neon PostgreSQL database and the same `@voltaris/core` package. Server-side code owns all database and Gemini API calls. Browser code never receives credentials.

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

Command may call typed, allowlisted operations for retrieval, incident lookup, dispatch checks, proposal creation, and approval. A model suggestion does not write a work order or booking without a human approval action. The system persists the approved action in a transaction and prevents duplicate slot bookings.

Margin reads structured operational and financial data. It computes metrics in SQL or deterministic TypeScript, then sends only computed evidence to Gemini for explanation. It may choose from allowlisted analyses; it may not execute free-form model SQL. `recognized_revenue - actual_cost` defines actual service margin; forecasts are separate.

## Agent coordination

Subagents own their app directories and should not edit `packages/core`, `database`, root configuration, or the other app. If a shared API is missing, request it from the root agent or add a local adapter in the owned app without changing shared files. The root agent owns shared contracts and integration.
