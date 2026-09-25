# Voltaris walkthrough and release checks

## 90-second walkthrough script

Open [Command](https://voltaris-energy-platform-command.vercel.app/) and [Margin](https://voltaris-energy-platform-margin.vercel.app/) in separate tabs. Both require the Voltaris staff login. For a clean approval sequence, report a new fictional incident: the seeded Hannover incident has already been approved and is useful for showing the connected backlog.

**0–12 seconds — context.** “Voltaris is a fictional energy-services company. Command and Margin are two connected products over the same real PostgreSQL data.”

**12–35 seconds — investigate.** In Command, open the Hannover charger fault. Show the asset, maintenance history, runbook citations, contract response target, and AI finding. Point out that claims cite stored evidence.

**35–55 seconds — approve.** For a new incident, generate the dispatch proposal. Show technician skill, appointment, cost estimate, and any SLA risk. Before approval, show that no work order exists. Approve and show the persisted work order and audit entry. For the seeded Hannover incident, show its already approved work order.

**55–75 seconds — connect.** Open Margin's service backlog for Hannover. Refresh. The approved order and forecast cost appear; the actual margin cards remain unchanged.

**75–90 seconds — explain.** Show Hannover's quarter comparison. Ask why margin changed. Show the AI explanation, posted metrics, and source-record drilldown. Explain that completing a work order posts actual cost separately.

## Release checks

- [x] Command login works on the deployed URL.
- [x] A newly reported incident appears after refresh (verified in the local app against the shared Neon database).
- [x] AI finding contains valid clickable evidence citations (verified in the local app; persisted finding shown on deployment).
- [x] Proposal shows a qualified slot and clearly states SLA feasibility or risk (persisted proposal shown on deployment).
- [x] No work order or booking exists before staff approval (verified by integration smoke test).
- [x] Approval creates one work order and a traceable audit entry (verified by integration smoke test and deployed readback).
- [x] Margin backlog shows the approved order while actual margin stays fixed on the deployed URL.
- [x] Completion removes the order from open backlog and posts actual cost (verified by integration smoke test).
- [x] Margin's regional metrics reconcile to posted records (verified by SQL/service tests and deployed dashboard).
- [ ] AI margin answer stays grounded in calculated metrics and links to source records.
- [x] Both products render at desktop and mobile width with working controls and error states (checked locally).
- [x] No environment files, credentials, or real customer data are in the repository.
