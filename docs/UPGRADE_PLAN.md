# Voltaris product upgrade plan

## Goal

Make Voltaris useful to an employer who opens it independently. A reviewer should be able to complete a real incident-to-financial-impact workflow in a safe workspace, then inspect the engineering evidence behind it. Voltaris remains a fictional company with synthetic records; the AI calls, database writes, approvals, audit trail, and financial calculations remain live.

The current portfolio release is complete. The items below are proposed upgrades, not features already delivered.

## Product experience first

The highest-priority upgrade is a **self-service product sandbox**. It should feel like the normal Command and Margin products: a reviewer reports a fault, examines retrieved evidence, requests a dispatch proposal, makes a human approval decision, and sees the resulting work order and forecast backlog in Margin. The reviewer's changes must persist through refreshes for that session. The existing read-only reviewer login can remain available for safe inspection of the main showcase data.

| Order | Upgrade | Work | Exit gate |
| --- | --- | --- | --- |
| 1 | Writable reviewer sandbox | Provide an invited reviewer with an isolated, seeded workspace and a short in-product starting path. Include at least a fresh fault, an already approved work order, and a margin question. Permit real actions within that workspace, then restore its starting state through an explicit reset or expiry. Bound AI usage and keep sandbox credentials and records separate from the main production workspace. Choose the isolation design only after verifying concurrent sessions and reset behavior. | A new reviewer can sign in without admin help, complete the Command approval flow, refresh both apps, see persisted changes in Margin, and reset the sandbox. Two reviewers cannot see or alter each other's records or the main showcase data. No control is decorative or simulated. |
| 2 | Repeatable release gate | Add CI for typechecks, builds, unit tests, and browser-level end-to-end tests against isolated database state. Cover login, authorization denial, valid and invalid AI citations, the approval boundary, duplicate booking, and forecast-versus-actual accounting. | Each pull request produces a clear pass/fail result; the core workflow can be rerun without leaving QA records in production. |
| 3 | Claim-level evidence | Give each proposed cause and recommended check its own source IDs. Use a constrained Gemini response schema and keep server-side citation validation and the conservative fallback. Add representative evaluation cases for insufficient evidence and malformed citations. | Every displayed AI claim links to relevant stored evidence or is visibly labeled as uncertain; unsupported claims never become saved findings. |
| 4 | Reliability visibility | Record request and AI latency, citation rejection and fallback rates, errors, and workflow completion. Add request tracing across Command, the shared core, database, and Margin, with a concise reliability summary in the case study. | A failed reviewer run can be traced to its cause without exposing secrets, and the portfolio can show measured reliability rather than relying on a single successful walkthrough. |

## Reviewer journey

1. A reviewer opens one clear entry page, sees that the company and records are fictional, and enters a temporary sandbox workspace.
2. Command presents a realistic incoming EV charger fault with its site, asset, service target, history, and runbooks. The reviewer can create a new incident or work from the prepared one.
3. The reviewer checks source-linked findings, sees a qualified technician and forecast cost, then approves the proposal. The work order and audit entry survive a refresh.
4. Margin shows the same work order in forecast backlog while actual service margin remains unchanged. The reviewer can ask a supported financial question and inspect the posted records behind the answer.
5. The reviewer can reset the workspace and repeat the flow. The interface explains failures and unavailable actions in normal product language.

The guided path should point to useful tasks while leaving the real product navigation and decisions available. The existing 90-second video remains an optional introduction; the live workspace is the primary experience.

## Presentation standard

Describe Voltaris as **two working, connected operations products for a fictional energy-services company**. Show a reviewer completing the workflow themselves. State clearly that the data is synthetic and identify the real services and safeguards. Keep the case study aligned with the live product, including what a real customer deployment would still require.

The first two upgrades have the greatest immediate effect on employer review. The evidence and reliability upgrades deepen the technical discussion once someone explores the architecture.
