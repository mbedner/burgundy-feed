# Burgundy Feed — Agent Guide

Washington Commanders news aggregator. Astro SSR on Cloudflare Pages + a separate Cloudflare Worker for ingest.

> **Implementation work:** Read [`IMPLEMENTATION_BRIEF.md`](./IMPLEMENTATION_BRIEF.md) before starting any feature work. It defines the full product roadmap, priority order, acceptance criteria, and handoff requirements. Follow the implementation order in section 22 and the audit checklist in section 1.

---

## Setup

```bash
npm install
npm run build   # verifies the project compiles — run after every change
```

No test suite exists. A clean `npm run build` is the pass/fail signal.

---

## Architecture

There are **two separately deployed runtimes**:

### 1. Astro Pages app (`src/`)
- Built with `npm run build` → `dist/`
- Deployed via: `npx wrangler pages deploy dist --project-name burgundy-feed --commit-dirty=true`
- Handles SSR rendering at request time
- Reads articles, breaking news, and standings from **Cloudflare KV** (`ARTICLES_KV`)

### 2. Ingest Worker (`workers/ingest-worker.ts`)
- Runs on a cron every hour (`0 * * * *`)
- Fetches RSS feeds, scores/ranks articles, detects breaking news, writes to KV
- Deployed via: `npx wrangler deploy workers/ingest-worker.ts --name burgundy-feed-ingest`
- **Must be deployed separately** from the Pages app — changing a shared `src/lib/` file (e.g. `breaking.ts`, `scoring.ts`) requires deploying BOTH

---

## Critical Constraint: ESPN API Blocking

**ESPN's Akamai CDN blocks all Cloudflare Workers egress IPs with 403.** This affects both the Pages SSR runtime and the ingest worker.

**Rule: never fetch `site.api.espn.com` server-side.** All ESPN data that the UI needs live (scores, game situation, standings, injuries, opponent info) must be fetched **client-side** in the visitor's browser.

The two client-side scripts that handle this:
- `src/scripts/gameday-client.ts` — live game banner (scores, field position, play-by-play, win probability)
- `src/scripts/rail-client.ts` — right rail (opponent preview, injury report, division standings)

These inject HTML into mount-point divs (`#gd-mount`, `#rail-opponent-mount`, `#rail-injury-mount`, `#rail-standings-mount`) that the SSR render leaves empty when server-side data is unavailable.

---

## Key Files

### Data pipeline
| File | Purpose |
|------|---------|
| `workers/ingest-worker.ts` | Hourly cron: fetches RSS, scores, writes KV |
| `src/lib/ingest.ts` | Article ingestion logic (fetch → parse → score → rewrite) |
| `src/lib/scoring.ts` | Relevance, freshness, composite scoring (0–100) |
| `src/lib/breaking.ts` | Breaking news detection — **phrase-based**, requires confirmed action verbs (e.g. `"was traded"`, not bare `"trade"`) |
| `src/lib/kv.ts` | KV read/write helpers |
| `src/lib/sources/` | RSS feed definitions per source |

### Pages (UI)
| File | Purpose |
|------|---------|
| `src/pages/index.astro` | Main page — reads KV, computes leads/stream, renders layout |
| `src/components/RightRail.astro` | Sidebar shell — mounts child components |
| `src/components/ScoresStrip.astro` | Score carousel (fully client-side, skeleton loader built-in) |
| `src/components/GameDayBanner.astro` | Game day banner (SSR path, usually unused in prod) |
| `src/scripts/gameday-client.ts` | Live game data — polls ESPN every ~10s during games |
| `src/scripts/rail-client.ts` | Rail data — fetches standings, injuries, opponent from ESPN client-side |

### Config
| File | Purpose |
|------|---------|
| `src/config/site.ts` | `SITE` constants (lead count, refresh interval, breaking threshold) |
| `src/config/sources.ts` | Keyword lists for relevance scoring |
| `src/config/schedule.ts` | 2026 season schedule, important dates, team stats |
| `src/config/players.ts` | Featured players for the rail |
| `src/config/reporters.ts` | Reporter Voices section config |

---

## Top Stories Logic (`src/pages/index.astro`)

Articles are pre-scored by the ingest worker. On render:
1. Filter to articles published within **6 hours** (falls back to full pool if < 3 fresh)
2. Fill positions 0–2 with **max 1 article per source** (diversity)
3. Positions 3+ allow duplicate sources
4. Slice to `SITE.leadCount`

The primary story + 2 secondaries come from `leads`; everything else goes to the news stream.

---

## Breaking News Logic (`src/lib/breaking.ts`)

`detectBreakingItems()` runs in the ingest worker. An article qualifies as breaking only if:
- Published within the last **90 minutes**
- Composite score ≥ `BREAKING_THRESHOLD` (65)
- Headline/summary contains a **confirmed-action phrase** (not bare nouns)

Good: `"was traded"`, `"signs with"`, `"placed on ir"`, `"officially released"`
Bad: `"trade"`, `"injury"`, `"signed"` (these catch opinion/analysis pieces)

---

## Win Probability & Game Day

`extractWinPct()` in `gameday-client.ts` tries two ESPN paths:
1. `winProbability[]` array → last entry's `homeWinPercentage` (0–1 decimal)
2. `predictor.homeTeam.gameProjection` (0–100 string) — more reliably present

Field position uses the **scoreboard endpoint** (`/scoreboard`), not the summary endpoint — the summary's `situation` is often null between plays. Both are fetched in parallel on every poll.

---

## URL Params (dev/testing)

- `?gameday=live|pregame|halftime|postgame` — force game day mock phase
- `?team=ABBR` — show game for a different team (overrides `?gameday`)
- `?refresh=Commanders` — trigger a live ingest before render
- `?draft=pre|active|post` — force draft day mock phase

Light/dark mode: use browser DevTools → Rendering → "Emulate CSS media feature prefers-color-scheme".

---

## Environment Secrets

The following environment variable must be set for deployment:

| Variable | Purpose |
|----------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler auth — needs Pages Edit + Workers Scripts Edit + Workers KV Edit permissions |

Wrangler auto-detects the account from the token. No `CLOUDFLARE_ACCOUNT_ID` needed.

---

## Deployment Checklist

Always build first to confirm the change compiles cleanly:
```bash
npm install
npm run build
```

When changing **UI only** (`src/components/`, `src/pages/`, `src/scripts/`):
```bash
npx wrangler pages deploy dist --project-name burgundy-feed --commit-dirty=true
```

When changing **shared lib files** (`src/lib/breaking.ts`, `src/lib/scoring.ts`, `src/lib/ingest.ts`, etc.) — deploy **both**:
```bash
npx wrangler pages deploy dist --project-name burgundy-feed --commit-dirty=true
npx wrangler deploy workers/ingest-worker.ts --name burgundy-feed-ingest
```

When changing **worker only** (`workers/ingest-worker.ts`):
```bash
npx wrangler deploy workers/ingest-worker.ts --name burgundy-feed-ingest
```

The Pages deploy URL will be a preview subdomain (`*.commanders-wire.pages.dev`). Production is `burgundyfeed.com`, which Cloudflare promotes automatically on each Pages deploy.
