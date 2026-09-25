# Voltaris Command

Command is the staff-facing EV charger incident workflow. It uses the shared `@voltaris/core` functions for all database and AI work; its Next.js routes only authenticate, validate, and present those results. The UI does not create local demo records or simulate successful actions.

## Workflow

1. Sign in with a seeded staff account. Managers can inspect records; dispatchers and admins can change them.
2. Report a fault against an existing asset. The record and audit entry are persisted immediately.
3. Run incident analysis. Command retrieves maintenance history, runbook chunks, and contract evidence, then saves an AI assessment with source IDs.
4. Build a technician and slot proposal. This is an unbooked recommendation until a staff member approves it.
5. Approve or reject explicitly. Approval creates a scheduled work order and forecast cost. Rejection records the reason and allows a new proposal.
6. Complete the work order with the actual cost and a service note. This updates the shared financial ledger, which Margin reads.

Each action has a loading state and a visible error path. The Evidence view shows the cited excerpts; Audit activity shows persisted `agent_actions` with actor and time.

## Server endpoints

All data endpoints require the signed `voltaris_session` cookie. All writes require admin or dispatcher role.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/login`, `POST /api/auth/logout` | Staff session |
| `GET /api/assets` | Existing service assets |
| `GET, POST /api/incidents` | Queue and fault report |
| `GET /api/incidents/:id` | Full incident, evidence, audit, proposal, work order |
| `POST /api/incidents/:id/analyze` | Cited AI assessment |
| `POST /api/incidents/:id/propose` | Technician and slot proposal |
| `POST /api/incidents/:id/decision` | Approve or reject |
| `POST /api/incidents/:id/complete` | Final cost and completion note |

## Verification path

Run `pnpm --filter @voltaris/command typecheck` and `pnpm --filter @voltaris/command build` from the repository root. Then, with configured credentials and database, sign in and complete the workflow above. Confirm the approval produces exactly one work order and booked slot; rejection produces no work order; completion posts one actual-cost event. Refresh after each step to verify persisted state.
