// ─── ESPN Unofficial API — Free, no key required ─────────────────────────────
// Washington Commanders ESPN team ID: 28
// All endpoints are public and used by ESPN's own web apps.

const TEAM_ID = '28';
const BASE    = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

export interface LiveStats {
  season:            string;
  record:            string;
  divisionRecord:    string;
  offenseRank:       number;
  defenseRank:       number;
  pointsPerGame:     number;
  pointsAllowed:     number;
  passYardsPerGame:  number;
  rushYardsPerGame:  number;
  leaders: {
    passingYards:   { name: string; stat: string };
    rushingYards:   { name: string; stat: string };
    receivingYards: { name: string; stat: string };
    sacks:          { name: string; stat: string };
    interceptions:  { name: string; stat: string };
    tackles:        { name: string; stat: string };
  };
  lastUpdated: string;
  source: 'espn' | 'fallback';
}

async function fetchJson(url: string, timeoutMs = 6000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'BurgundyFeed/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function safeNum(v: unknown, fallback = 0): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? fallback : n;
}

function safeStr(v: unknown, fallback = 'N/A'): string {
  return v ? String(v) : fallback;
}

// ── Transactions ──────────────────────────────────────────────────────────────

export interface EspnTransaction {
  date:        string;   // ISO string
  description: string;   // raw ESPN text, e.g. "Signed DB Ahkello Witherspoon to a contract."
  type:        'signing' | 'release' | 'trade' | 'hire' | 'other';
}

function classifyTransaction(desc: string): EspnTransaction['type'] {
  const d = desc.toLowerCase().trimStart();
  if (d.startsWith('signed') || d.startsWith('re-signed')) return 'signing';
  if (d.startsWith('released') || d.startsWith('waived'))   return 'release';
  if (d.startsWith('traded'))                                return 'trade';
  if (d.startsWith('hired') || d.startsWith('named') || d.startsWith('promoted')) return 'hire';
  return 'other';
}

export async function fetchTransactions(limit = 50): Promise<EspnTransaction[]> {
  try {
    const data = await fetchJson(
      `${BASE}/transactions?limit=${limit}&team=${TEAM_ID}`,
    ) as any;
    const raw: { date: string; description: string }[] = data?.transactions ?? [];
    return raw.map(t => ({
      date:        t.date,
      description: t.description,
      type:        classifyTransaction(t.description),
    }));
  } catch (err) {
    console.warn('[espn] transactions fetch failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

export async function fetchLiveStats(): Promise<LiveStats | null> {
  try {
    // Determine current NFL season year (season starts in September)
    const now         = new Date();
    const seasonYear  = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;

    // Fetch team summary (record, standings rank)
    const teamData = await fetchJson(`${BASE}/teams/${TEAM_ID}`) as any;
    const team     = teamData?.team;

    const record      = team?.record?.items?.[0]?.summary ?? '0-0';
    const divRecord   = team?.record?.items?.find((r: any) =>
      r.name?.toLowerCase().includes('division'))?.summary ?? '0-0';

    // Fetch current season schedule to calculate stats
    const schedData   = await fetchJson(
      `${BASE}/teams/${TEAM_ID}/schedule?season=${seasonYear}`,
    ) as any;

    // Fetch standings for rank info
    const standData   = await fetchJson(
      `https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=${seasonYear}`,
    ) as any;

    // Find Washington in standings
    let offenseRank = 0;
    let defenseRank = 0;
    const entries: any[] = standData?.standings?.entries ?? [];
    for (const entry of entries) {
      if (entry?.team?.id === TEAM_ID) {
        for (const stat of entry?.stats ?? []) {
          if (stat.name === 'pointsFor')    offenseRank = safeNum(stat.rank);
          if (stat.name === 'pointsAgainst') defenseRank = safeNum(stat.rank);
        }
        break;
      }
    }

    // Fetch team stat leaders from the scoreboard/summary endpoint
    const summaryData = await fetchJson(
      `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${seasonYear}/teams/${TEAM_ID}/statistics`,
    ) as any;

    const splits = summaryData?.splits?.categories ?? [];

    function getStat(category: string, statName: string): string {
      const cat = splits.find((c: any) => c.name === category);
      const s   = cat?.stats?.find((s: any) => s.name === statName);
      return s ? safeStr(s.displayValue) : 'N/A';
    }

    const ppg  = safeNum(getStat('scoring', 'pointsPerGame').replace(/[^0-9.]/g, ''));
    const oppg = safeNum(getStat('defensiveScoringAllowed', 'pointsPerGame').replace(/[^0-9.]/g, ''));

    // Leader stats — ESPN provides player leaders per team
    const leadersData = await fetchJson(
      `${BASE}/teams/${TEAM_ID}?enable=roster,projection,stats`,
    ) as any;

    function leaderFallback(name: string, stat: string) {
      return { name, stat };
    }

    // Best-effort leader extraction
    const athletes: any[] = leadersData?.team?.athletes ?? [];
    function topAthleteBy(statKey: string): { name: string; stat: string } {
      let best: { name: string; val: number; display: string } | null = null;
      for (const a of athletes) {
        for (const s of a?.statistics ?? []) {
          if (s.name === statKey) {
            const v = safeNum(s.value);
            if (!best || v > best.val) {
              best = { name: a.fullName ?? 'Unknown', val: v, display: s.displayValue ?? String(v) };
            }
          }
        }
      }
      return best ? { name: best.name, stat: best.display } : { name: '—', stat: '—' };
    }

    return {
      season:           String(seasonYear),
      record,
      divisionRecord:   divRecord,
      offenseRank:      offenseRank || 16,
      defenseRank:      defenseRank || 16,
      pointsPerGame:    ppg || 0,
      pointsAllowed:    oppg || 0,
      passYardsPerGame: 0,
      rushYardsPerGame: 0,
      leaders: {
        passingYards:   topAthleteBy('passingYards'),
        rushingYards:   topAthleteBy('rushingYards'),
        receivingYards: topAthleteBy('receivingYards'),
        sacks:          topAthleteBy('sacks'),
        interceptions:  topAthleteBy('interceptions'),
        tackles:        topAthleteBy('tackles'),
      },
      lastUpdated: new Date().toISOString(),
      source: 'espn',
    };
  } catch (err) {
    console.warn('[espn] stats fetch failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
