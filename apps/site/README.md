# Voltaris public site

The public front door for Voltaris Energy. It tells the complete operational journey and links to the existing Command and Margin products without sharing their credentials or changing their code.

## Local run

At the repository root, run `pnpm install` then `pnpm dev:site`. Open `http://localhost:3002`. The site is static content and needs no environment variables.

## Pages

- `/` — cinematic incident-to-margin story, interactive simulated network, live product screenshots, captioned video background, and reviewer entry.
- `/platform` — company and platform model.
- `/command` and `/margin` — product workflows with real application captures.
- `/architecture` — service boundaries, shared core, persistence, and approval transaction.
- `/case-study` — problem, design, verifiable outcome, and links to the repository.
- `/reviewer` — clear sign-in and shift instructions with direct live product links.

The homepage network is explicitly simulated. The video, stills, and fictional company disclosure are local static assets. No staff login is published on the site.

## Deploy

Create a new Vercel project from this monorepo with **Root Directory** `apps/site`, **Framework** Next.js, and no environment variables. Existing Command and Margin project settings should remain as they are. After deployment, update `metadataBase` in `app/layout.tsx` and the README live-sites table if the final URL differs from the expected Vercel address.
