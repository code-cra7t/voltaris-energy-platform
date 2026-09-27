# Voltaris Energy: reviewer and operator guide

Voltaris Energy is a fictional European energy-services company. Start at the [public Voltaris site](https://voltaris-energy-platform-site.vercel.app/) to follow the company, product, and incident story, then enter the private reviewer workspace. Command and Margin are two connected working products built around synthetic sites, chargers, people, contracts, and financial records. Sign-in, AI calls, database writes, approvals, audit entries, scheduling, and financial calculations are real. Neither product controls a physical charger or connects to a real customer system.

## For a reviewer: one shift, two products

Use the invited Voltaris email and password provided privately. The same account signs in to [Command](https://voltaris-energy-platform-command.vercel.app/) and [Margin](https://voltaris-energy-platform-margin.vercel.app/). The products have separate web addresses, so you may need to sign in to each once. Your workspace is private to that account, retains changes across refreshes, and expires on the date in your invitation.

| Step | In Command or Margin | What to look for |
| --- | --- | --- |
| 1 | Open Command. Select **Open incoming fault** in the shift handoff. | A repeat connector fault on charger **VC-HAN-001** at Hannover Messe Hub. The record includes a contract target, prior maintenance, and field guidance. |
| 2 | Select **Analyze incident**. Open the source chips beside the findings. | Each AI cause or check carries its own source IDs. If the model cannot provide valid citations, Command saves a clearly marked uncertain source review instead of an unsupported diagnosis. |
| 3 | Select **Build proposal**. Inspect the technician, slot, forecast cost, and response-target warning. | This is a proposal. The slot is still available, and there is no work order yet. |
| 4 | Select **Approve & schedule**. Refresh Command and open **Audit activity**. | The decision, booked slot, work order, and audit entry persist. The action required your approval; the AI could not book the visit itself. |
| 5 | Open Margin from the handoff link and select **View Hannover backlog**. Refresh if Margin was already open. | The new work order joins an already approved temperature-warning job. Its forecast cost appears in backlog; recognized revenue and actual service margin remain unchanged. |
| 6 | In Margin, ask **What is in the service backlog?** Then open **Overview** and inspect posted financial events. | The answer is constrained to computed figures and linked records. Forecasts and actuals are separate. |
| 7 | Optionally return to Command and complete the new work order with a real numeric cost and a service note. Refresh Margin. | A posted actual-cost event changes actual service margin; the open backlog no longer includes the completed job. |

You can also report a new incident using **Report incident**, search the queue, reject a proposal, or choose another region. Those controls write to your private workspace. **Restore shift state** explicitly returns only your workspace to the original handoff: one incoming fault, one already scheduled job, open technician availability, and the synthetic financial history. It does not change another reviewer's records or the main showcase workspace.

The existing `reviewer@voltaris.example` account is read-only and shows the shared showcase records. An invited workspace account is writable. If you see a role warning after using the read-only account, sign in with the invited account to perform dispatch actions.

## How to present it in an interview

Start with the operational question: “A charger at a commercial site keeps failing. Can the service team use its own evidence to plan a response without giving the AI authority to dispatch?” Let the interviewer choose the incoming fault and inspect a source. Pause at the unapproved proposal. Then approve it, switch to Margin, and show the forecast backlog while actual margin stays fixed. If there is time, complete the work order and show the posted actual cost.

The important engineering explanation is that the model produces **advisory, source-linked claims**. Code validates source IDs. A deterministic service layer chooses the technician and slot. A staff action changes state inside a PostgreSQL transaction. Margin uses fixed, parameterized SQL and calculates actuals from posted events; Gemini only explains computed results. A trace ID appears in structured server logs for each request. The same work-order ID connects Command's approval to Margin's forecast and later actual cost.

Do not describe Voltaris as a live energy utility or imply production integrations to ERP, CRM, Google Calendar, Gmail, or chargers. The value shown is a complete, editable operations workflow on fictional data.

## For an operator: inviting reviewers

The production database needs `database/migrations/002_reviewer_workspaces.sql` applied before the upgraded applications are deployed. The migration adds a workspace assignment to staff accounts, an expiry registry, and a daily AI-usage counter. Existing staff default to `public` and keep their current behavior. Run schema migrations through a **direct** Neon connection; app traffic can continue through a pooled connection.

From `packages/core`, with the correct Voltaris `DATABASE_URL` in the ignored root `.env.local`:

```sh
pnpm db:migrate
pnpm sandbox:create reviewer-name@example.com "Reviewer Name" 30
```

The command creates an isolated `sandbox_*` PostgreSQL schema, seeds the fictional shift, creates a dispatcher account, and writes the random password to an ignored `.env.sandbox-<schema>.local` file with owner-only permissions. Share the login privately. Never commit that file or paste a password into the repository. Use one account per reviewer. The final number is the expiry in days (1–90). An expired or deactivated workspace cannot sign in or execute business queries. New sessions last eight hours. Each invited account is limited to 20 AI calls per database day; the applications still return their conservative/computed fallback when the allowance is spent.

The account's signed session carries its workspace schema. Every business query opens a transaction and sets a single-entry `search_path` locally. A missing sandbox table therefore fails rather than reading `public` data. Before each workspace operation, the server checks that the signed-in staff ID owns an active, unexpired workspace. Reset is restricted to that workspace and reseeds it transactionally. Global account and allowance tables stay in `public`.

## Release and reliability checks

Pull requests and pushes to `tori` run `.github/workflows/release-gate.yml`. The workflow provisions a disposable pgvector-backed Postgres service, applies migrations, seeds two reviewer workspaces, checks cross-workspace isolation, approval and duplicate denial, forecast versus actual accounting, and reset. It then typechecks, runs unit tests, builds both apps, and runs Playwright through the signed-in Command and Margin journey. The browser suite also checks unauthenticated and read-only denial. A failed Playwright run uploads its trace for diagnosis. These CI records never enter Neon production.

For a manual Neon validation, create a child branch with data and schema, point `DATABASE_URL` to that branch, create two sandbox accounts, and run `pnpm sandbox:verify` with `SANDBOX_TEST_EMAIL_A` and `SANDBOX_TEST_EMAIL_B`. This test **writes and resets** its first sandbox. Never point it at a workspace whose changes you need to retain.

Server logs are structured JSON and omit prompts, passwords, keys, and SQL values. `request.complete` includes product, operation, workspace, trace ID, and duration. `db.query` and `db.transaction` carry the same trace ID. `ai.request` records model, HTTP status, latency, and fallback-model use. `ai.fallback` distinguishes provider failure, insufficient evidence, and rejected citations. `sandbox.reset` records a reset. Export logs as newline-delimited JSON and run:

```sh
node scripts/reliability-summary.mjs command.ndjson margin.ndjson
```

The report gives request and AI counts, errors, fallback and citation-rejection counts, resets, and latency percentiles for the supplied window. It does not claim an uptime percentage from a single browser run. Use the trace ID to follow a failed request through the app and database; use the persisted incident/work-order ID to connect the Command and Margin records.

## Practical limits

- The two Vercel products use separate sign-ins because their cookies are bound to different domains.
- The workspace is an invited account, not a public anonymous signup. This keeps writable data and AI usage bounded.
- The AI validates exact retrieved source IDs, but a qualified person must still judge the substance of a maintenance claim. A schema controls output shape; it does not prove a diagnosis.
- A real customer deployment would add enterprise SSO, tenant policies or row-level security, external system integrations, retention rules, monitoring alerts, and operational safety review.
