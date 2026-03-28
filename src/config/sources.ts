// ─── News Source Configuration ────────────────────────────────────────────────
// Add/remove/adjust sources here. Each source has:
//   id          – unique slug used in logs and deduplication
//   name        – display name shown on the site
//   rssUrl      – public RSS feed URL
//   quality     – 1–10 source quality weight used in scoring
//   type        – 'beat' | 'national' | 'blog' | 'local'
//   commandersFocus – true if the source is Commanders-specific (higher relevance bonus)
//   enabled     – set false to disable without deleting

import type { SourceConfig } from '../lib/types';

export const SOURCES: SourceConfig[] = [
  // ── Commanders-focused ──────────────────────────────────────────────────────
  {
    id:               'commanders-wire',
    name:             'Commanders Wire',
    rssUrl:           'https://commanderswire.usatoday.com/feed/',
    quality:          8,
    type:             'beat',
    commandersFocus:  true,
    enabled:          true,
  },
  {
    id:               'hogs-haven',
    name:             'Hogs Haven',
    rssUrl:           'https://www.hogshaven.com/rss/current',
    quality:          7,
    type:             'blog',
    commandersFocus:  true,
    enabled:          true,
  },

  // ── Local Beat ──────────────────────────────────────────────────────────────
  {
    id:               'washington-post',
    name:             'Washington Post',
    rssUrl:           'https://feeds.washingtonpost.com/rss/sports/nfl',
    quality:          9,
    type:             'local',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'nbcs-washington',
    name:             'NBC Sports Washington',
    rssUrl:           'https://www.nbcsports.com/washington/rss',
    quality:          8,
    type:             'local',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'wtop',
    name:             'WTOP Sports',
    rssUrl:           'https://wtop.com/sports/feed/',
    quality:          6,
    type:             'local',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'washington-times',
    name:             'Washington Times',
    rssUrl:           'https://www.washingtontimes.com/rss/headlines/sports/',
    quality:          6,
    type:             'local',
    commandersFocus:  false,
    enabled:          true,
  },

  // ── National NFL ────────────────────────────────────────────────────────────
  {
    id:               'espn-nfl',
    name:             'ESPN',
    rssUrl:           'https://www.espn.com/espn/rss/nfl/news',
    quality:          9,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'nfl-dot-com',
    name:             'NFL.com',
    rssUrl:           'https://www.nfl.com/rss/rsslanding?searchString=commanders',
    quality:          8,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'cbs-sports-nfl',
    name:             'CBS Sports',
    rssUrl:           'https://www.cbssports.com/rss/headlines/nfl/',
    quality:          8,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'si-nfl',
    name:             'Sports Illustrated',
    rssUrl:           'https://www.si.com/nfl/rss',
    quality:          7,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'theringer-nfl',
    name:             'The Ringer',
    rssUrl:           'https://www.theringer.com/rss/nfl/index.xml',
    quality:          8,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'touchdown-wire',
    name:             'Touchdown Wire',
    rssUrl:           'https://touchdownwire.usatoday.com/feed/',
    quality:          7,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'bleacher-report',
    name:             'Bleacher Report',
    rssUrl:           'https://bleacherreport.com/articles/feed?tag=washington-commanders',
    quality:          6,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'fox-sports-nfl',
    name:             'Fox Sports',
    rssUrl:           'https://api.foxsports.com/v1/rss?legacy=true&searchTerm=nfl',
    quality:          7,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'athletic-nfl',
    name:             'The Athletic',
    rssUrl:           'https://theathletic.com/rss-feed/',
    quality:          9,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
];

// ─── Blocklist ─────────────────────────────────────────────────────────────────
// Any URL containing these strings will be rejected at ingestion time.
// ProFootballTalk is permanently blocked per product rules.
export const BLOCKED_DOMAINS: string[] = [
  'profootballtalk.com',
  'nfltraderumors.co',
  'fansided.com',          // often low quality
  'clutchpoints.com',
];

// ─── Required Commanders relevance keywords ────────────────────────────────────
// A story must contain at least one of these to be considered Commanders-relevant.
// (The scoring function also checks title/summary; this is a soft pre-filter.)
export const COMMANDERS_KEYWORDS: string[] = [
  'commanders',
  'washington commanders',
  'washington football',
  'jayden daniels',
  'dan quinn',
  'adam peters',
  'josh harris',
  'bobby mclaughlin',    // DC
  'kliff kingsbury',
  'terry mclaurin',
  'brian robinson',
  'austin ekeler',
  'sam howell',          // still relevant for trade context
  'casey toohill',
  'daron payne',
  'jamin davis',
  'jeremy chinn',
  'nick bellore',
  'commanders wire',
  'hogs haven',
  'fedexfield',
  'rfk stadium',
];

// ─── Broader NFL keywords that add partial relevance ─────────────────────────
// Stories containing these get a lower relevance boost unless they also contain
// a Commanders keyword.
export const NFL_CONTEXT_KEYWORDS: string[] = [
  'nfl draft',
  'nfc east',
  'nfl trade',
  'salary cap',
  'free agency',
  'nfl combine',
  'nfl scouting',
];
