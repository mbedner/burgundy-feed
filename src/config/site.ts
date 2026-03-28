// ─── Site-wide config ────────────────────────────────────────────────────────
// Edit this file to change the site's identity, refresh behavior, and tone.

export const SITE = {
  name:       'BURGUNDY FEED',
  tagline:    'Every story. No fluff. All burgundy.',
  url:        'https://burgundyfeed.com',

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

// ── Transaction Tracker ───────────────────────────────────────────────────────
// Shows a "Transaction Wire" feed of signings, trades, releases, and suspensions.
// Active during free agency + draft window. Update dates each year.
export const TRANSACTION_SEASON = {
  // 2026: legal tampering opens Mar 10, draft ends ~Apr 27
  start:              '2026-03-10',
  end:                '2026-04-30',

  // Hard override: true = always show, false = always hide, null = use dates/activity
  override:           null as boolean | null,

  // Also show outside the date window if this many transaction articles
  // appeared in the last activityWindowDays (catches mid-season blockbusters)
  activityThreshold:  3,
  activityWindowDays: 5,

  // Max items to display in the tracker
  maxItems: 10,

  // Label shown next to the section heading
  label: 'Free Agency 2026',
};
