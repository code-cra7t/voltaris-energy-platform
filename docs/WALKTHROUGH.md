# Voltaris walkthrough and release checks

## 90-second walkthrough script

**0–12 seconds — context.** “Voltaris is a fictional energy-services company. Command and Margin are two connected products over the same real PostgreSQL data.”

**12–35 seconds — investigate.** In Command, open the Hannover charger fault. Show the asset, maintenance history, runbook citations, contract response target, and AI finding. Point out that claims cite stored evidence.

**35–55 seconds — approve.** Generate the dispatch proposal. Show technician skill, appointment, cost estimate, and any SLA risk. Before approval, show that no work order exists. Approve and show the persisted work order and audit entry.

**55–75 seconds — connect.** Open Margin's service backlog for Hannover. Refresh. The approved order and forecast cost appear; the actual margin cards remain unchanged.

**75–90 seconds — explain.** Show Hannover's quarter comparison. Ask why margin changed. Show the AI explanation, posted metrics, and source-record drilldown. Explain that completing a work order posts actual cost separately.

## Release checks

- [ ] Command login works on the deployed URL.
- [ ] A newly reported incident appears after refresh.
- [ ] AI finding contains valid clickable evidence citations.
- [ ] Proposal shows a qualified slot and clearly states SLA feasibility or risk.
- [ ] No work order or booking exists before staff approval.
- [ ] Approval creates one work order and a traceable audit entry.
- [ ] Margin backlog shows the approved order while actual margin stays fixed.
- [ ] Completion removes the order from open backlog and posts actual cost.
- [ ] Margin's regional metrics reconcile to posted records.
- [ ] AI margin answer stays grounded in calculated metrics and links to source records.
- [ ] Both products render at desktop and mobile width with working controls and error states.
- [ ] No environment files, credentials, or real customer data are in the repository.
