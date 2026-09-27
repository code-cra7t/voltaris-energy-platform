# Case study: from a charger fault to a financial decision

## The problem

A service organization receives charger faults in one queue, technician availability in another, maintenance history in documents, and cost information later in a financial system. A dispatcher needs a trustworthy proposal without losing control of the booking. A manager needs to understand whether response activity is changing service margin.

Voltaris Energy is fictional. The product uses synthetic energy-service records to demonstrate this workflow with live AI and database state.

## Command: accountable operations

Command starts from a persisted asset and incident. It retrieves matching field runbooks, recent maintenance records, and the active service contract. Gemini returns schema-constrained JSON claims, with separate source IDs for each proposed cause and check. The service layer rejects a whole claim if any ID is outside the retrieved set. When citations are absent or the service is unavailable, Command saves a visibly uncertain source review. The UI places the source chips beside each accepted claim.

Dispatch is deterministic. The backend selects an active technician with the required EV-charger skill and an available future slot, preferring slots within the contract response window, then local travel. If none fits the target, the proposal explicitly flags an SLA risk. Labor, travel, and urgency allowances form the displayed estimate.

Approval is the state boundary. Before it, the proposal has not booked a slot or created a work order. An authenticated staff decision runs a database transaction that books the slot, creates the work order, posts a forecast cost, updates the incident, and writes approval and audit entries. A concurrent decision cannot book the same slot twice. Rejection records the reason and returns the incident to analysis.

Completion records the actual cost and service note and posts an actual financial event. Electrical diagnosis and repair remain a qualified technician's responsibility.

## Margin: evidence-backed intelligence

Margin reads posted financial events from PostgreSQL. For a selected region and quarter, it calculates recognized revenue, actual direct cost, margin, rate, prior-quarter change, monthly trend, region breakdown, and category drivers. Source-record drilldown is filtered and paginated in SQL, so users can inspect the entries behind a metric.

The question interface maps a business question to one of four approved analyses: margin change, revenue drivers, cost drivers, or backlog. It sends computed JSON to Gemini for explanation. The model receives no database credentials and cannot generate executable SQL. Its prose is constrained to avoid unsupported figures; the interface supplies verified numbers and source records separately.

If the AI service is unavailable or returns wording that fails validation, Margin serves a plainly labeled explanation derived from the posted metrics. The user still gets the financial evidence without mistaking a fallback for AI output.

Open Command work orders populate the backlog with forecast costs. This forecast never changes actual service margin. Only completion and a posted actual-cost event change the margin calculation.

## Technical choices

- **One relational model:** assets, sites, contracts, incidents, technician slots, proposals, approvals, work orders, actions, and financial events share foreign keys and transactions.
- **Two independent products:** Command and Margin deploy separately and share a versioned TypeScript service package. Each can evolve its interface without duplicating financial or operational rules.
- **Human approval:** consequential actions are explicit, auditable state transitions.
- **Constrained AI:** retrieval and calculations happen in code; the model explains evidence and expresses uncertainty.
- **Synthetic yet editable:** the sample company is labeled, while new incidents, decisions, completions, and resulting financial entries persist for real.
- **Invited review spaces:** each reviewer owns an expiring PostgreSQL schema with a seeded shift, writable operations, one already approved work order, an explicit reset, and a 20-call daily AI allowance. The shared showcase remains separate.
- **Traceable operation:** structured request, database, and AI logs share a trace ID within each request. The persisted work-order ID links Command's approval and Margin's financial records.

## Verified scenario

On a disposable Neon child branch, two invited accounts were seeded and checked concurrently. A new incident in one schema was invisible in the other and in `public`. The test analyzed evidence, held a dispatch proposal without booking, approved it, denied a duplicate approval, observed the added Margin backlog while actual margin stayed fixed, completed the work, observed the actual-cost increase, and reset the first schema without changing the second. A real Gemini structured-output request returned HTTP 200 and six claim-level findings. The local Playwright suite then passed three browser checks: the reviewer workflow across both products, unauthenticated denial, and read-only staff denial. This is a measured release sample, not an uptime claim; subsequent CI runs repeat the checks on disposable PostgreSQL state.

Operational logs record request and AI latency, AI HTTP failures, conservative fallbacks, citation rejections, errors, and resets. `scripts/reliability-summary.mjs` summarizes exported logs for a chosen window, so a failed reviewer session can be investigated by trace ID without recording prompts or credentials. An individual incident/work-order ID connects the operational and financial records across products.

## Production extension

For a real enterprise tenant, the next steps are SSO, stronger tenant policy enforcement, real ERP/CRM and calendar connectors, consent and retention policies, monitoring alerts, service-level escalation rules, and integration tests against customer contracts. Those integrations are deliberately absent from this fictional portfolio deployment.
