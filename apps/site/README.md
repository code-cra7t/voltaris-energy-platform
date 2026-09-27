# Voltaris public site

The [live public front door](https://voltaris-energy-platform-site.vercel.app/) for Voltaris Energy. It tells the complete operational journey and links to the existing Command and Margin products without sharing their credentials or changing their code.

## Local run

At the repository root, run `pnpm install` then `pnpm dev:site`. Open `http://localhost:3002`. The site is static content and needs no environment variables.

## Pages

- `/` — cinematic incident-to-margin story, original EV infrastructure imagery, real product screenshots, captioned video background, and reviewer entry.
- `/platform` — company and platform model.
- `/command` and `/margin` — product workflows with real application captures.
- `/architecture` — service boundaries, shared core, persistence, and approval transaction.
- `/case-study` — problem, design, verifiable outcome, and links to the repository.
- `/about` — fictional company context, working software scope, and image disclosure.
- `/reviewer` — clear sign-in and shift instructions with direct live product links.

The homepage network is explicitly simulated. The full page set uses original AI-generated illustrative EV infrastructure and operations imagery, with real captures from the working products and an existing captioned product walkthrough. The Command-to-Margin handoff animates a work order into a forecast record; reduced-motion users see the same information without the transfer animation. Image and fictional company disclosures are visible in the experience. No staff login is published on the site.

## Deploy

The Vercel project is `voltaris-energy-platform-site`, connected to the `tori` branch with **Root Directory** `apps/site`, **Framework** Next.js, and no environment variables. Its production URL matches the metadata, sitemap, and robots defaults. Command and Margin remain separate projects.
