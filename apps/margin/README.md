# Margin

Margin is the Voltaris Energy service finance application. It reads the shared PostgreSQL model through `@voltaris/core` and shows actual service margin separately from open work-order forecasts.

## Experience

- Authenticated staff dashboard with quarter and region filters.
- Recognized revenue, actual direct cost, margin, monthly trend, regional breakdown, and category drivers calculated by the shared core.
- Event-level evidence with cursor pagination. Displayed amounts are converted from integer cents returned by the core.
- Open approved work-order backlog with forecast revenue and cost, kept out of actual metrics.
- “Ask your business” accepts four allowlisted analyses: margin change, revenue drivers, cost drivers, and backlog. No model-generated SQL is executed.

## Routes

- `GET /api/dashboard?region=&quarter=` — actual quarter metrics and comparisons.
- `GET /api/evidence?region=&quarter=&kind=&category=&limit=&cursor=` — financial source records, including exact category drilldown.
- `GET /api/backlog?region=` — open approved work orders and forecasts.
- `POST /api/ask` — allowlisted analysis of computed data.
- `POST /api/login`, `POST /api/logout` — staff session cookie.

Each data route verifies the HttpOnly `voltaris_session` cookie. The main page redirects unauthenticated users to `/login`.
