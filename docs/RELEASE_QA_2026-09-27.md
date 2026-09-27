# Employer walkthrough QA — 27 September 2026

Both Vercel production deployments for commit `579cea0` were `READY` before this pass. The test used the two public production URLs, the shared Neon database, the existing admin account, and one clearly labeled fictional QA incident. No credentials are recorded here.

| Check | Production result |
| --- | --- |
| Command incident creation | New incident `732384f9-3b8f-4760-8db1-10b4cbfcadc1` created on Hannover asset `VC-HAN-001`; retrieved evidence was present. |
| Grounded analysis | Gemini assessment saved with eight distinct valid source citations. Invalid-citation and model-unavailable fallback cases passed local unit tests. |
| Human approval boundary | Proposal named Jonas Becker and forecast €170. No work order existed before approval. Approval created `WO-C1DBCFD0` and an audit entry. |
| Command → Margin | Hannover open backlog increased from zero to one; forecast cost increased. Actual revenue, actual cost, and actual margin stayed unchanged at the approval step. Actual margin was €7,870. |
| Margin explanation | Supported Hannover margin question returned an `ai_grounded` answer linked to 12 financial source records. |
| Reviewer access | `reviewer@voltaris.example` signed in to both apps. Both read requests returned HTTP 200; Command analysis returned HTTP 403. Password remains in ignored `.env.reviewer.local`. |
| Build and tests | Core citation tests, Command presenter test, three TypeScript checks, and optimized Command and Margin builds passed locally. |
| Command runtime logs | Vercel showed zero warning, error, or fatal log entries in the 30-minute window ending about 09:59 Berlin time; the walkthrough requests returned HTTP 200 or 201. The expected reviewer denial returned HTTP 403. |

The QA work order remains in the synthetic production dataset as a live example of the approval and forecast backlog workflow. This pass verifies the end-to-end scenario once. It does not establish a 24-hour error-free observation period, and the conservative citation fallback was verified by unit tests rather than forced in the production environment.
