# Commanders Wire

Washington Commanders newswire — single-page, mobile-first, hourly updates, free to run.

---

## What it is

A dense, fast, dark-mode sports newswire for obsessive Commanders fans. One page. Refreshes every hour. Aggregates headlines from a curated list of beat writers and national outlets. Rewrites display headlines in a dry, sports-radio-smart tone. Shows a breaking ticker when something big happens.

No login. No backend. No paid APIs. No ProFootballTalk. No giant hero cards.

---

## Stack

| Layer | Tech | Why |
|---|---|---|
| Frontend | Astro SSR | Zero-JS by default, fast to deliver, SSR reads from KV on each request |
| Styles | Tailwind CSS | Utility-first, no runtime overhead |
| Hosting | Cloudflare Pages | Free tier, global CDN, edge SSR |
| Ingest | Cloudflare Workers (cron) | Free tier, 100k req/day, cron triggers |
| Storage | Cloudflare KV | Free tier (100k reads/day), shared by worker + pages |
| Parsing | fast-xml-parser | Fast, zero-dependency RSS/Atom parsing |

---

## Project structure

```
commanders-wire/
├── src/
│   ├── pages/
│   │   └── index.astro          # The single page
│   ├── components/
│   │   ├── Masthead.astro
│   │   ├── BreakingTicker.astro
│   │   ├── LeadStories.astro
│   │   ├── NewsStream.astro
│   │   ├── StoryItem.astro
│   │   ├── RightRail.astro
│   │   ├── Schedule.astro
│   │   ├── TeamStats.astro
│   │   ├── TeamDates.astro
│   │   └── ReporterVoices.astro
│   ├── lib/
│   │   ├── types.ts             # All TypeScript types
│   │   ├── kv.ts                # KV read/write helpers
│   │   ├── scoring.ts           # Relevance + freshness scoring
│   │   ├── rewrite.ts           # Headline rewrite logic
│   │   ├── breaking.ts          # Breaking news detection
│   │   ├── ingest.ts            # Ingestion orchestrator
│   │   └── sources/
│   │       └── rss.ts           # RSS/Atom fetch + parse
│   └── config/
│       ├── site.ts              # Site-wide settings
│       ├── sources.ts           # News sources (allow/blocklist)
│       ├── reporters.ts         # X reporter handles / list URL
│       ├── players.ts           # Featured players spotlight
│       └── schedule.ts          # Schedule, stats, key dates
├── workers/
│   └── ingest-worker.ts         # Cloudflare Worker (cron + manual refresh)
├── public/
│   └── favicon.svg
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── wrangler.toml
└── package.json
```

---

## Local setup

### Prerequisites

- Node.js 18+
- A Cloudflare account (free)
- Wrangler CLI: `npm install -g wrangler`

### Install

```bash
cd commanders-wire
npm install
```

### Local dev (no live data)

```bash
npm run dev
```

The page renders with empty/fallback state because there's no local KV.
This is expected — see "Seeding local data" below.

### Seeding local data for development

Wrangler can run a local KV proxy:

```bash
# In terminal 1: run astro dev with wrangler platform proxy
npx wrangler pages dev -- npx astro dev

# In terminal 2: trigger a local ingest
npx wrangler dev workers/ingest-worker.ts --local
# Then hit: http://localhost:8787/refresh?secret=your_secret
```

Or you can temporarily hardcode mock data in `src/pages/index.astro` for UI work.

---

## Deploy to Cloudflare (free)

### Step 1 — Create KV namespace

```bash
npx wrangler kv:namespace create "commanders-wire-articles"
# Note the `id` and `preview_id` from output
npx wrangler kv:namespace create "commanders-wire-articles" --preview
```

Update `wrangler.toml` with the actual IDs.

### Step 2 — Deploy the ingest Worker

```bash
# Set the refresh secret
npx wrangler secret put REFRESH_SECRET
# Enter a strong random string when prompted

# Deploy
npx wrangler deploy workers/ingest-worker.ts
```

The cron runs `0 * * * *` (top of every hour). The free Worker plan includes 100k requests/day and cron triggers.

### Step 3 — Deploy the Astro site to Pages

```bash
npm run build
npx wrangler pages deploy dist/ --project-name commanders-wire
```

Or connect your GitHub repo to Cloudflare Pages (recommended):
1. Push this repo to GitHub
2. Cloudflare Dashboard → Pages → Create a project
3. Connect repo
4. Build command: `npm run build`
5. Build output directory: `dist`
6. Add environment variable: `NODE_VERSION=18`

### Step 4 — Bind KV to Pages

Cloudflare Dashboard → Pages project → Settings → Functions → KV namespace bindings:
- Variable name: `ARTICLES_KV`
- KV namespace: `commanders-wire-articles` (same namespace as the Worker)

### Step 5 — First ingest

Hit the worker's manual refresh endpoint to populate KV before the next cron fires:

```bash
curl -X GET "https://commanders-wire-ingest.your-subdomain.workers.dev/refresh" \
  -H "x-refresh-secret: YOUR_SECRET"
```

The site will serve live data on the next page load.

---

## Configuration

### Sources (`src/config/sources.ts`)

Add, remove, or disable sources. Each source has:
- `quality` (1–10) — affects ranking weight
- `commandersFocus` — gives a relevance bonus
- `enabled` — flip to `false` to disable without deleting

ProFootballTalk is permanently blocked via `BLOCKED_DOMAINS`. Do not remove it.

### Rewrite mode (`src/config/site.ts`)

Change `rewriteMode`:
- `straight` — original headline, no edits
- `witty` — dry prefixes on negative/positive stories (default)
- `savage` — more aggressive snark on bad news

You can also set `REWRITE_MODE` as a Worker env variable to override without redeploying.

### Reporter voices (`src/config/reporters.ts`)

Set `xListUrl` to a public X List URL for a single clean timeline embed.

If you don't have a list, leave it `null` and the site falls back to individual profile links + lazy-loaded embeds for the first 2 handles.

Add/remove handles in the `handles` array.

### Featured players (`src/config/players.ts`)

Edit the array. Each player shows in the right-rail spotlight module.

### Schedule & stats (`src/config/schedule.ts`)

Update `UPCOMING_SCHEDULE` and `TEAM_STATS` manually each week/season, or wire them to a free API (see "Free data sources" below).

### Breaking threshold (`src/config/site.ts`)

`BREAKING_THRESHOLD` (0–100) controls when stories appear in the ticker.
Default: 72. Lower it to see more breaking items; raise it to require stronger signals.

---

## Data flow

```
[Cloudflare Worker cron — every hour]
  ↓
fetchRssFeed() × N sources (concurrent, 6 at a time)
  ↓
scoreRelevance() → filter < MIN_RELEVANCE_SCORE
scoreFreshness() → weight by age
detectSentiment() → positive / negative / neutral
detectTags()     → injury, trade, draft, QB, etc.
rewriteHeadline() → display headline in chosen tone
computeCompositeScore() → 0–100 final rank
deduplicate()    → canonical URL + fuzzy title match
  ↓
writeArticles(KV)   → articles:latest
detectBreakingItems() → writeBreaking(KV) → breaking:latest
writeLastRun(KV)    → ingest:lastrun
  ↓
[Astro SSR page load]
  ↓
readAll(KV)      → { articles, breaking, lastRun }
Render single page (zero client JS for core content)
Auto-reload after 1 hour if tab is visible
```

---

## Scoring algorithm

Final score is a 0–100 weighted composite:

| Signal | Weight |
|---|---|
| Commanders relevance | 40% |
| Freshness | 30% |
| Source quality (1–10) | 20% |
| Tag count (bonus) | 5% |
| Commanders-focused source bonus | +3 pts |
| Breaking news bonus | +8 pts |

Stories below `MIN_RELEVANCE_SCORE` (default: 30) are dropped before scoring.

---

## Headline rewrite system

Rewrites are 100% deterministic, template-based, and free (no AI API needed).

Pipeline:
1. Apply word/phrase substitutions (see `SUBSTITUTIONS` in `rewrite.ts`)
2. Detect sentiment from keyword signals
3. For `witty` mode: prepend a dry prefix on negative/positive stories
4. For `straight`: return original
5. Neutral stories get substitutions only — no snark forced

To tune tone, edit the prefix banks in `src/lib/rewrite.ts`.

---

## Breaking ticker

A story qualifies for the ticker if:
- Score ≥ `BREAKING_THRESHOLD` (default: 72)
- Published within last 4 hours
- Contains at least one hard breaking keyword (injury, trade, release, fired, signed, etc.)

The ticker is hidden completely when no breaking items qualify. It auto-scrolls on mobile.

---

## Free data sources

### Schedule and stats

The schedule and stats are currently static in `src/config/schedule.ts`.

Free options to make them live:
- **ESPN API (unofficial)**: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/28/schedule`
  Team ID 28 = Washington Commanders. No API key required. Cache responses in KV.
- **MySportsFeeds**: Free tier available with attribution.
- **SportsDB**: Free open API — `https://www.thesportsdb.com/api/v1/json/3/`

If you wire these up, add the fetch logic to a separate `workers/stats-worker.ts` and store results in KV under `stats:snapshot`.

### X / Twitter embeds

The X embed widget is free for public timelines and lists. It requires no API key.

Limitation: X embeds can be slow. They are lazy-loaded using IntersectionObserver so they only fire when the section scrolls into view. This keeps the core news feed fast.

If X embeds become unreliable (X policy changes), replace the section with a manually curated "reporter quotes" block updated via config.

---

## Tradeoffs and limitations

| What | Limitation | Mitigation |
|---|---|---|
| Headline rewrites | Template-based, not AI-generated. Tone is consistent but not contextually nuanced. | Tune prefix banks in `rewrite.ts`. Can add a Claude API call as an optional enhancement. |
| Article summaries | RSS descriptions only. No full-text parsing. | Legally and ethically appropriate. Good for fast scanning. |
| Stats data | Manual config file. Not live. | Can wire ESPN's unofficial API in an hour — see above. |
| X embeds | Performance hit if not lazy-loaded | Lazy-loaded via IntersectionObserver. Core news renders with zero JS. |
| RSS availability | Some outlets occasionally drop or move RSS feeds | Source config is modular — disable broken sources in `sources.ts` |
| KV cold start | First page load after a long idle may be slightly slow | KV has very fast global reads; Cloudflare Pages edge caches HTML too |
| Free tier limits | KV: 100k reads/day, 1k writes/day. Workers: 100k req/day | More than enough for personal use. Costs ~$5/month if you exceed free tiers. |

---

## Manual refresh

To force an ingest outside of the hourly cron:

```bash
curl "https://YOUR_WORKER.workers.dev/refresh?secret=YOUR_SECRET"
```

Or with header:
```bash
curl -H "x-refresh-secret: YOUR_SECRET" "https://YOUR_WORKER.workers.dev/refresh"
```

Returns JSON with article count and any source errors.

---

## Custom domain

1. Cloudflare Dashboard → Pages → Custom domains
2. Add your domain (e.g. `commanders.yourdomain.com`)
3. Cloudflare handles SSL automatically

---

## Upgrading headline rewrites to AI

If you want Claude-powered rewrites (much better tone), add this to the ingest worker:

```ts
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 100,
  messages: [{
    role: 'user',
    content: `Rewrite this NFL headline in a dry, sports-radio-smart tone (one line, max 12 words): "${originalHeadline}"`,
  }],
});
```

Haiku is fast and cheap (sub-cent per headline). Cache by headline hash to avoid re-generating on re-ingests. Set `ANTHROPIC_API_KEY` as a Worker secret.

---

## Updating the season

Each season, update:
1. `src/config/schedule.ts` — `UPCOMING_SCHEDULE`, `TEAM_STATS`, `IMPORTANT_DATES`
2. `src/config/players.ts` — current roster spotlight
3. `src/config/sources.ts` — verify all RSS URLs still work

---

## License

Personal use. Do not redistribute article content — this aggregates headlines, metadata, and short summaries only, which is consistent with fair use and standard RSS feed usage.
