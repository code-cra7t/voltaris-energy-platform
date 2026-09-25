# Voltaris Energy product sprint

## Objective

Build two deployed, connected, functional products for a fictional European energy-services company. The audience is employers hiring for AI engineering, automation, data, software, cloud, digital transformation, and technical product roles. The company and initial records are fictional; the workflows, database writes, calculations, approvals, and audit trails must be real.

## Product scope

### Command — AI Operations Agent

The first complete workflow is an EV charging incident. A staff member reports a fault for a real asset record. Command retrieves relevant maintenance history and runbook excerpts, identifies plausible causes with citations, checks contract/SLA and technician availability, proposes a work order and appointment, and requires an explicit staff approval before writing the scheduled action. The approved action and every AI step appear in an audit trail. AI may advise on operations but does not control electrical equipment.

### Margin — AI Revenue and Operations Intelligence

A manager can ask why a region's service margin changed. Margin computes current and comparison-period revenue, direct costs, margin, and drivers from PostgreSQL; charts the result; links figures to underlying records; and uses AI only to explain computed evidence. It also shows service backlog and forecast costs from open work orders. Forecast values stay distinct from recognized revenue and actual cost.

### Integration

Both products share one PostgreSQL data model. An approved Command work order updates Margin's open backlog and forecast cost. Completing a work order and posting financial events updates actual service margin. The integration is verified from the deployed URLs, not just local fixtures.

## Four-day milestones

| Day | Milestone | Exit gate |
| --- | --- | --- |
| 1 | Shared schema and Command incident-to-approval flow | An incident produces cited findings, a feasible technician/slot proposal, and an approved persisted work order with audit entries. |
| 2 | Command product finish | Authenticated staff experience, error/recovery states, mobile layout, deployment, and a repeatable end-to-end test. |
| 3 | Margin product finish | Real SQL metrics, regional margin analysis, record-level evidence, AI explanation, responsive dashboard, and deployment. |
| 4 | Connected release | Cross-product state change verified, edge cases tested, visual QA, docs, architecture diagram, case studies, and 90-second walkthrough. |

## Work ownership

- Root agent: architecture and contracts, shared data/AI package, Neon and Vercel/GitHub setup, integration, security review, end-to-end QA, and final release.
- Command subagent: `apps/command/**` only. Build the operations UI and server routes against the shared contracts. Own Command-specific tests and documentation.
- Margin subagent: `apps/margin/**` only. Build analytics UI and server routes against the shared contracts. Own Margin-specific tests and documentation.
- Additional QA/design subagent, if useful after the first integration: bounded cross-app review with no overlapping edits unless assigned exact files.

## Build rules

1. Finish the working vertical slice before broadening the surface.
2. No dead controls or fake actions in the released experience.
3. Show the source of every retrieved claim and calculated number.
4. Require approval for consequential agent actions.
5. Do not pass unrestricted model-generated SQL to the database. Use allowlisted metric operations.
6. Keep fictional seed data clearly labeled; users must be able to create or update operational records.
7. Store secrets only in ignored local environment files or platform secret settings.
8. Do not declare a product complete until its deployed path passes the exit gate.

## Dependencies and current status

- Gemini AI Studio: existing API key visible in the signed-in account; key not yet configured in this workspace.
- Neon: separate Voltaris Energy project created in Frankfurt; schema and fictional records loaded.
- GitHub and Vercel: signed-in browser sessions available; CLI authorization not yet configured.
- Gmail and Google Calendar: connected to Codex, but not automatically authorized for the deployed products. The first release uses an internal schedule and in-app confirmation.
