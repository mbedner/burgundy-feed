// ─── Core data types ──────────────────────────────────────────────────────────

export type RewriteMode = 'straight' | 'witty' | 'savage';

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
  id:                string;   // sha256 of canonicalUrl or sourceUrl
  sourceId:          string;   // matches SourceConfig.id
  sourceName:        string;
  sourceUrl:         string;   // the RSS item link
  canonicalUrl:      string;   // resolved final URL (may == sourceUrl)
  author:            string | null;
  publishedAt:       string;   // ISO 8601
  ingestedAt:        string;   // ISO 8601
  originalHeadline:  string;
  displayHeadline:   string;   // rewritten for display
  summary:           string | null;
  imageUrl?:         string | null;
  tags:              ArticleTag[];
  score:             number;   // 0–100 composite ranking score
  relevanceScore:    number;   // 0–100 Commanders relevance
  isBreaking:        boolean;
  sentiment:         'positive' | 'negative' | 'neutral';
}

export interface BreakingItem {
  id:        string;
  headline:  string;  // short punchy single line
  sourceUrl: string;
  sourceName:string;
  detectedAt:string;  // ISO 8601
}

export interface IngestRun {
  id:           string;  // ISO timestamp
  startedAt:    string;
  completedAt:  string | null;
  articlesFound:number;
  articlesNew:  number;
  errors:       string[];
  sources:      { id: string; success: boolean; count: number }[];
}

export interface SourceConfig {
  id:              string;
  name:            string;
  rssUrl:          string;
  quality:         number;   // 1–10
  type:            'beat' | 'national' | 'blog' | 'local';
  commandersFocus: boolean;
  enabled:         boolean;
  stripTitleSuffix?: boolean; // strip trailing " - Source Name" (e.g. Google News)
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
