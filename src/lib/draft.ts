// ─── NFL Draft Mode — ESPN Public API ────────────────────────────────────────
// Draft dates and Washington detection for the live pick tracker.

const WAS_ID   = '28';
const DRAFT_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/draft';

// Update year + dates each spring
export const DRAFT_CONFIG = {
  year:  2026,
  dates: ['2026-04-23', '2026-04-24', '2026-04-25'],
  // Round schedule (approximate ET start times for countdown)
  rounds: {
    1: { date: '2026-04-23', startHour: 20 },  // Thu 8 PM ET
    2: { date: '2026-04-24', startHour: 19 },  // Fri 7 PM ET
    3: { date: '2026-04-24', startHour: 19 },
    4: { date: '2026-04-25', startHour: 12 },  // Sat noon ET
    5: { date: '2026-04-25', startHour: 12 },
    6: { date: '2026-04-25', startHour: 12 },
    7: { date: '2026-04-25', startHour: 12 },
  } as Record<number, { date: string; startHour: number }>,
};

// Position ID → abbreviation (ESPN draft position IDs)
const POS_MAP: Record<string, string> = {
  '1':  'WR', '7':  'TE', '8':  'QB', '9':  'RB', '10': 'FB',
  '11': 'K',  '12': 'P',  '14': 'OT', '15': 'OG', '16': 'C',
  '17': 'OL', '20': 'DE', '21': 'DT', '22': 'NT', '23': 'DL',
  '24': 'ILB','25': 'OLB','26': 'LB', '28': 'CB', '29': 'S',
  '30': 'LB', '31': 'SS', '32': 'FS', '36': 'S',  '91': 'OT',
};

export interface DraftPick {
  overall:    number;
  round:      number;
  pick:       number;           // pick number within the round
  teamId:     string;
  teamName:   string;
  teamAbbr:   string;
  playerName: string;
  position:   string;
  college:    string;
  isWashington: boolean;
  traded:     boolean;
  tradeNote:  string;
  completed:  boolean;
}

export interface DraftOnTheClock {
  teamName:  string;
  teamAbbr:  string;
  overall:   number;
  round:     number;
  pick:      number;
  isWashington: boolean;
}

export type DraftState = 'pre' | 'active' | 'post';

export interface DraftInfo {
  year:          number;
  state:         DraftState;
  currentRound:  number;
  onTheClock:    DraftOnTheClock | null;
  recentPicks:   DraftPick[];      // last 15 completed, newest first
  washingtonPicks: DraftPick[];    // all WAS picks (completed + upcoming)
  totalPicks:    number;
  completedCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchJson(url: string, ms = 8000): Promise<unknown> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal:  ctrl.signal,
      headers: { 'User-Agent': 'CommandersWire/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function safeStr(v: unknown, fb = ''): string {
  return v ? String(v) : fb;
}

function parsePick(p: any, teams: Map<string, { name: string; abbr: string }>): DraftPick {
  const teamId   = safeStr(p?.teamId);
  const team     = teams.get(teamId) ?? { name: 'Unknown', abbr: '???' };
  const athlete  = p?.athlete;
  const posId    = safeStr(athlete?.position?.id);
  const completed = p?.status === 'COMPLETED' || !!athlete?.displayName;

  return {
    overall:      p?.overall ?? 0,
    round:        p?.round   ?? 1,
    pick:         p?.pick    ?? 0,
    teamId,
    teamName:     team.name,
    teamAbbr:     team.abbr,
    playerName:   safeStr(athlete?.displayName, '—'),
    position:     POS_MAP[posId] ?? safeStr(athlete?.position?.abbreviation, '?'),
    college:      safeStr(athlete?.team?.shortDisplayName ?? athlete?.team?.location, ''),
    isWashington: teamId === WAS_ID,
    traded:       !!p?.traded,
    tradeNote:    safeStr(p?.tradeNote),
    completed,
  };
}

// ── Is today a draft day? ─────────────────────────────────────────────────────

export function isDraftDay(): boolean {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  return DRAFT_CONFIG.dates.includes(today);
}

// ── Fetch live draft data ─────────────────────────────────────────────────────

export async function fetchDraftData(): Promise<DraftInfo | null> {
  try {
    const data = await fetchJson(`${DRAFT_URL}?season=${DRAFT_CONFIG.year}`) as any;

    const status: DraftState = data?.status?.state === 'in'   ? 'active'
                             : data?.status?.state === 'post' ? 'post'
                             : 'pre';
    const currentRound: number = data?.status?.round ?? 1;

    // Build team lookup map
    const teamMap = new Map<string, { name: string; abbr: string }>();
    for (const t of data?.teams ?? []) {
      teamMap.set(safeStr(t.id), {
        name: safeStr(t.shortDisplayName ?? t.name, 'Unknown'),
        abbr: safeStr(t.abbreviation, '???'),
      });
    }

    // Parse all picks
    const allPicks: DraftPick[] = (data?.picks ?? []).map((p: any) => parsePick(p, teamMap));

    const completedPicks = allPicks.filter(p => p.completed);
    const recentPicks    = [...completedPicks].reverse().slice(0, 15);
    const washingtonPicks = allPicks.filter(p => p.isWashington);

    // On the clock: first non-completed pick
    const clockPick = allPicks.find(p => !p.completed);
    let onTheClock: DraftOnTheClock | null = null;
    if (clockPick && status === 'active') {
      onTheClock = {
        teamName:     clockPick.teamName,
        teamAbbr:     clockPick.teamAbbr,
        overall:      clockPick.overall,
        round:        clockPick.round,
        pick:         clockPick.pick,
        isWashington: clockPick.isWashington,
      };
    }

    return {
      year:           DRAFT_CONFIG.year,
      state:          status,
      currentRound,
      onTheClock,
      recentPicks,
      washingtonPicks,
      totalPicks:     allPicks.length,
      completedCount: completedPicks.length,
    };
  } catch (err) {
    console.warn('[draft] fetch failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Dev mock ──────────────────────────────────────────────────────────────────

export function getMockDraft(state: DraftState = 'active'): DraftInfo {
  // All 7 projected 2026 Washington picks
  const wasPicks: DraftPick[] = [
    { overall:7,   round:1, pick:7,  teamId:'28', teamName:'Commanders', teamAbbr:'WAS', playerName:'Mykel Williams',  position:'EDGE', college:'Georgia',     isWashington:true, traded:false,  tradeNote:'', completed: state !== 'pre' },
    { overall:39,  round:2, pick:7,  teamId:'28', teamName:'Commanders', teamAbbr:'WAS', playerName:'Elic Ayomanor',   position:'WR',   college:'Stanford',    isWashington:true, traded:false,  tradeNote:'', completed: state === 'post' },
    { overall:72,  round:3, pick:8,  teamId:'28', teamName:'Commanders', teamAbbr:'WAS', playerName:'Grey Zabel',      position:'OG',   college:'NDSU',        isWashington:true, traded:false,  tradeNote:'', completed: state === 'post' },
    { overall:107, round:4, pick:7,  teamId:'28', teamName:'Commanders', teamAbbr:'WAS', playerName:'Dont\'e Thornton', position:'WR',  college:'Tennessee',   isWashington:true, traded:false,  tradeNote:'', completed: state === 'post' },
    { overall:145, round:5, pick:12, teamId:'28', teamName:'Commanders', teamAbbr:'WAS', playerName:'Jake Briningstool',position:'TE',  college:'Clemson',     isWashington:true, traded:true,   tradeNote:'via trade with Pittsburgh', completed: state === 'post' },
    { overall:183, round:6, pick:19, teamId:'28', teamName:'Commanders', teamAbbr:'WAS', playerName:'Trey Amos',       position:'CB',   college:'Ole Miss',    isWashington:true, traded:false,  tradeNote:'', completed: state === 'post' },
    { overall:221, round:7, pick:18, teamId:'28', teamName:'Commanders', teamAbbr:'WAS', playerName:'Josaiah Stewart', position:'EDGE', college:'Michigan',    isWashington:true, traded:false,  tradeNote:'', completed: state === 'post' },
  ];

  const recentPicks: DraftPick[] = state === 'pre' ? [] : [
    { overall:6,  round:1, pick:6,  teamId:'1',  teamName:'Bears',      teamAbbr:'CHI', playerName:'Tetairoa McMillan', position:'WR', college:'Arizona',    isWashington:false, traded:false, tradeNote:'', completed:true },
    { overall:5,  round:1, pick:5,  teamId:'3',  teamName:'Patriots',   teamAbbr:'NE',  playerName:'Will Johnson',      position:'CB', college:'Michigan',   isWashington:false, traded:false, tradeNote:'', completed:true },
    { overall:4,  round:1, pick:4,  teamId:'4',  teamName:'Giants',     teamAbbr:'NYG', playerName:'Mason Graham',      position:'DT', college:'Michigan',   isWashington:false, traded:false, tradeNote:'', completed:true },
    { overall:3,  round:1, pick:3,  teamId:'5',  teamName:'Patriots',   teamAbbr:'NE',  playerName:'Armand Membou',     position:'OT', college:'Missouri',   isWashington:false, traded:false, tradeNote:'', completed:true },
    { overall:2,  round:1, pick:2,  teamId:'6',  teamName:'Browns',     teamAbbr:'CLE', playerName:'Abdul Carter',      position:'EDGE', college:'Penn State',isWashington:false, traded:false, tradeNote:'', completed:true },
    { overall:1,  round:1, pick:1,  teamId:'7',  teamName:'Titans',     teamAbbr:'TEN', playerName:'Cam Ward',          position:'QB', college:'Miami',      isWashington:false, traded:false, tradeNote:'', completed:true },
    ...(state !== 'pre' ? [wasPicks[0]] : []),
  ].filter(p => p.completed).reverse();

  const onTheClock: DraftOnTheClock | null = state === 'active' ? {
    teamName: 'Cowboys', teamAbbr: 'DAL',
    overall: 12, round: 1, pick: 12,
    isWashington: false,
  } : null;

  return {
    year:           2026,
    state,
    currentRound:   1,
    onTheClock,
    recentPicks,
    washingtonPicks: wasPicks,
    totalPicks:     257,
    completedCount: state === 'pre' ? 0 : state === 'active' ? 7 : 257,
  };
}
