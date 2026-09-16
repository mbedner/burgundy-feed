// ─── Core data types ──────────────────────────────────────────────────────────

export type RewriteMode = 'straight' | 'witty' | 'savage';

export type PaywallStatus = 'free' | 'subscription' | 'may_require' | 'unknown';
export type ContentType   = 'news' | 'analysis' | 'opinion' | 'rumor' | 'official' | 'recap' | 'preview' | 'listicle';
export type SourceTier    = 1 | 2 | 3;

export interface ScoreComponents {
  relevance:     number;
  freshness:     number;
  sourceQuality: number;
  isBreaking:    boolean;
  tier:          SourceTier;
  contentType:   ContentType;
}

export type ArticleTag =
  | 'injury'
  | 'trade'
  | 'draft'
  | 'cap'
  | 'rumor'
  | 'signing'
  | 'release'
  | 'suspension'
  | 'analysis'
  | 'coach'
  | 'QB'
  | 'defense'
  | 'offense'
  | 'roster'
  | 'stadium'
  | 'ownership'
  | 'good'
  | 'bad'
  | 'weird'
  | 'national';

export interface Article {
  id:                  string;          // sha256 of canonicalUrl + title
  sourceId:            string;          // matches SourceConfig.id
  sourceName:          string;
  sourceUrl:           string;          // the RSS item link (original)
  canonicalUrl:        string;          // normalized final URL
  author:              string | null;
  publishedAt:         string;          // ISO 8601 UTC (source publication time)
  ingestedAt:          string;          // ISO 8601 UTC (Burgundy Feed discovery time)
  lastUpdatedAt?:      string;          // ISO 8601 UTC — set when metadata changes
  originalHeadline:    string;
  displayHeadline:     string;          // rewritten for display
  summary:             string | null;
  imageUrl?:           string | null;
  tags:                ArticleTag[];
  score:               number;          // 0–100 composite ranking score
  relevanceScore:      number;          // 0–100 Commanders relevance
  isBreaking:          boolean;
  sentiment:           'positive' | 'negative' | 'neutral';
  // Phase 2 additions (optional for backward compat with pre-migration KV data)
  contentType?:         ContentType;
  paywallStatus?:       PaywallStatus;
  paywallReason?:       string;         // why classified (source-level, url-pattern, etc.)
  sourceTier?:          SourceTier;
  isOriginalReporting?: boolean;
  clusterId?:           string;         // set after story clustering
  scoreComponents?:     ScoreComponents;
  runId?:               string;         // ingest run that created/updated this article
  status?:              'active' | 'removed' | 'unavailable';
}

export interface BreakingItem {
  id:        string;
  headline:  string;  // short punchy single line
  sourceUrl: string;
  sourceName:string;
  detectedAt:string;  // ISO 8601
}

export type IngestStatus =
  | 'running'
  | 'successful'
  | 'partially_successful'
  | 'failed';

export interface IngestRun {
  id:                string;   // uuid v4
  startedAt:         string;   // ISO 8601 UTC
  completedAt:       string | null;  // ISO 8601 UTC
  status:            IngestStatus;
  sourcesAttempted:  number;
  sourcesSucceeded:  number;
  sourcesFailed:     number;
  articlesFound:     number;   // raw items across all sources before dedup
  articlesNew:       number;   // distinct articles kept after dedup
  articlesUpdated:   number;   // existing articles refreshed (metadata change)
  duplicatesRejected:number;   // items dropped by dedup
  errors:            string[];
  sources:           { id: string; success: boolean; count: number; error?: string }[];
}

export interface SourceConfig {
  id:                  string;
  name:                string;
  rssUrl:              string;
  quality:             number;        // 1–10
  type:                'beat' | 'national' | 'blog' | 'local';
  commandersFocus:     boolean;
  enabled:             boolean;
  stripTitleSuffix?:   boolean;       // strip trailing " - Source Name" (e.g. Google News)
  tier:                SourceTier;    // 1=official/trusted, 2=reputable, 3=fan/aggregator
  paywall:             PaywallStatus; // source-level default
  paywallUrlPatterns?: string[];      // URL substrings that indicate subscriber content
  isOriginalReporting: boolean;       // true for beat reporters and official sources
}

export interface StoredData {
  articles:  Article[];
  breaking:  BreakingItem[];
  lastRun:   IngestRun | null;
  nfcEast?:  RivalItem[];
}

export interface RivalItem {
  team:        'cowboys' | 'giants' | 'eagles';
  teamName:    string;
  headline:    string;
  url:         string;
  sourceName:  string;
  publishedAt: string;
  imageUrl:    string | null;
}
