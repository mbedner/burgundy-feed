// ─── Site-wide config ────────────────────────────────────────────────────────
// Edit this file to change the site's identity, refresh behavior, and tone.

export const SITE = {
  name:       'COMMANDERS WIRE',
  tagline:    'Every story. No fluff. All burgundy.',
  url:        'https://commanders-wire.pages.dev', // update after deploy

  // Tone for display headline rewrites: 'straight' | 'witty' | 'savage'
  // Override via REWRITE_MODE env var in wrangler.toml
  rewriteMode: 'witty' as 'straight' | 'witty' | 'savage',

  // How many stories to show on the page
  storyCount: 28,

  // How many lead stories get the big treatment
  leadCount: 3,

  // Refresh interval hint for the client (ms) — purely informational badge
  refreshIntervalMs: 60 * 60 * 1000,

  // KV key names — change only if you restructure storage
  kvKeys: {
    articles:  'articles:latest',
    breaking:  'breaking:latest',
    lastRun:   'ingest:lastrun',
  },
};

// Breaking news score threshold (0–100).
// Stories at or above this score AND passing keyword checks trigger the ticker.
export const BREAKING_THRESHOLD = 72;

// Minimum Commanders relevance score to include a story at all (0–100)
export const MIN_RELEVANCE_SCORE = 10;
