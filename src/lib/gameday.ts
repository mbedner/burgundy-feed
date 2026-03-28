// ─── Game Day Detection & Data Types ─────────────────────────────────────────
// Uses ESPN's unofficial public API — no key required.
// Washington Commanders team ID: 28

const TEAM_ID = '28';
const BASE    = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

export type GamePhase = 'pregame' | 'live' | 'halftime' | 'postgame';

export interface GameTeam {
  id:            string;
  name:          string;         // "Commanders"
  abbreviation:  string;         // "WAS"
  score:         number;
  isHome:        boolean;
  winner:        boolean;
  logo:          string;
  color:         string;
}

export interface GamePlay {
  id:          string;
  text:        string;
  type:        string;
  clock:       string;
  period:      number;
  isScoring:   boolean;
  scoringType: string;           // "TD", "FG", "Safety", ""
  wasScore:    number;
  oppScore:    number;
}

export interface GameSituation {
  down:                  number;
  distance:              number;
  yardLine:              number;
  downDistanceText:      string;  // "2nd & 7"
  possessionTeamId:      string;
  isWashingtonPossession: boolean;
}

export interface GameDayInfo {
  gameId:         string;
  phase:          GamePhase;
  kickoffIso:     string;         // ISO timestamp
  kickoffDisplay: string;         // "4:25 PM ET"
  network:        string;         // "FOX"
  venue:          string;         // "FedExField"
  washington:     GameTeam;
  opponent:       GameTeam;
  period:         number;
  periodDisplay:  string;         // "Q3", "Half", "OT"
  clock:          string;         // "8:42"
  situation:      GameSituation | null;
  recentPlays:    GamePlay[];     // last 10, newest first
  scoringPlays:   GamePlay[];     // all scoring plays
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal:  ctrl.signal,
      headers: { 'User-Agent': 'BurgundyFeed/1.0' },
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

function phaseFromStatus(state: string, description: string): GamePhase {
  if (state === 'pre')  return 'pregame';
  if (state === 'post') return 'postgame';
  if (description?.toLowerCase().includes('halftime')) return 'halftime';
  return 'live';
}

function periodDisplay(period: number, phase: GamePhase): string {
  if (phase === 'halftime') return 'Half';
  if (period > 4)           return `OT${period - 4 > 1 ? period - 4 : ''}`;
  return `Q${period}`;
}

function scoringType(typeId: string): string {
  const map: Record<string, string> = {
    '67': 'TD', '68': 'TD', '72': 'TD',   // rushing/passing/return TD
    '59': 'FG', '63': 'FG',               // field goal
    '70': 'Safety',
    '57': 'XP', '58': 'XP',               // PAT
    '69': '2PT',
  };
  return map[typeId] ?? '';
}

function buildPlay(p: any, wasId: string): GamePlay {
  const typeId = safeStr(p?.type?.id);
  return {
    id:          safeStr(p?.id),
    text:        safeStr(p?.text),
    type:        safeStr(p?.type?.text),
    clock:       safeStr(p?.clock?.displayValue, '—'),
    period:      p?.period?.number ?? 0,
    isScoring:   !!p?.scoringPlay,
    scoringType: scoringType(typeId),
    wasScore:    0,  // filled in for scoring plays
    oppScore:    0,
  };
}

// ── Dev / preview mock ────────────────────────────────────────────────────────
// Activated via ?gameday=pregame|live|halftime|postgame in the URL (server-side).

export function getMockGame(phase: GamePhase): GameDayInfo {
  const kickoffIso = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const washington: GameTeam = {
    id: '28', name: 'Commanders', abbreviation: 'WAS',
    score: phase === 'pregame' ? 0 : phase === 'postgame' ? 24 : 17,
    isHome: true, winner: phase === 'postgame', logo: '', color: '5a1414',
  };
  const opponent: GameTeam = {
    id: '6', name: 'Cowboys', abbreviation: 'DAL',
    score: phase === 'pregame' ? 0 : phase === 'postgame' ? 17 : 10,
    isHome: false, winner: false, logo: '', color: '003594',
  };

  const mockPlays: GamePlay[] = [
    { id:'1', text:'J.Daniels pass short right to T.McLaurin to DAL 22 for 18 yards (T.Diggs)', type:'Pass Reception', clock:'8:42', period:3, isScoring:false, scoringType:'', wasScore:17, oppScore:10 },
    { id:'2', text:'J.Daniels scrambles left for 9 yards (L.Collins)', type:'Rushing', clock:'9:14', period:3, isScoring:false, scoringType:'', wasScore:17, oppScore:10 },
    { id:'3', text:'R.White up the middle for 4 yards (M.Parsons)', type:'Rushing', clock:'9:51', period:3, isScoring:false, scoringType:'', wasScore:17, oppScore:10 },
    { id:'4', text:'TOUCHDOWN — R.White 4 Yd Run (Brandon Aubrey kicks extra point)', type:'Rushing TD', clock:'11:02', period:3, isScoring:true, scoringType:'TD', wasScore:17, oppScore:10 },
    { id:'5', text:'J.Daniels pass deep right to N.Brown to DAL 8 for 31 yards', type:'Pass Reception', clock:'11:48', period:3, isScoring:false, scoringType:'', wasScore:10, oppScore:10 },
    { id:'6', text:'D.Prescott pass short middle to C.Lamb to WAS 38 for 12 yards', type:'Pass Reception', clock:'13:21', period:3, isScoring:false, scoringType:'', wasScore:10, oppScore:10 },
    { id:'7', text:'Brandon Aubrey 48 Yd Field Goal', type:'Field Goal', clock:'0:02', period:2, isScoring:true, scoringType:'FG', wasScore:10, oppScore:10 },
    { id:'8', text:'J.Daniels pass incomplete deep left (T.Diggs)', type:'Pass Incompletion', clock:'0:08', period:2, isScoring:false, scoringType:'', wasScore:7, oppScore:10 },
    { id:'9', text:'TOUCHDOWN — J.Daniels 1 Yd Run', type:'Rushing TD', clock:'4:33', period:2, isScoring:true, scoringType:'TD', wasScore:7, oppScore:7 },
    { id:'10', text:'TOUCHDOWN — C.Lamb 22 Yd Pass from D.Prescott', type:'Passing TD', clock:'8:15', period:2, isScoring:true, scoringType:'TD', wasScore:0, oppScore:7 },
  ];

  const scoringPlays = mockPlays.filter(p => p.isScoring);

  return {
    gameId:        'MOCK',
    phase,
    kickoffIso,
    kickoffDisplay:'4:25 PM ET',
    network:       'FOX',
    venue:         'FedExField · Landover, MD',
    washington,
    opponent,
    period:        phase === 'pregame' ? 1 : phase === 'postgame' ? 4 : 3,
    periodDisplay: phase === 'pregame' ? 'Q1' : phase === 'halftime' ? 'Half' : phase === 'postgame' ? 'Q4' : 'Q3',
    clock:         phase === 'live' ? '8:42' : '0:00',
    situation: phase === 'live' ? {
      down: 2, distance: 7, yardLine: 31,
      downDistanceText: '2nd & 7',
      possessionTeamId: '28',
      isWashingtonPossession: true,
    } : null,
    recentPlays:  mockPlays,
    scoringPlays,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function detectGameDay(): Promise<GameDayInfo | null> {
  try {
    // 1. Check today's scoreboard for a Washington game
    const board = await fetchJson(`${BASE}/scoreboard`) as any;
    const events: any[] = board?.events ?? [];

    const event = events.find(e =>
      e?.competitions?.[0]?.competitors?.some((c: any) => c?.id === TEAM_ID),
    );
    if (!event) return null;

    const gameId  = safeStr(event.id);
    const comp    = event.competitions[0];
    const status  = comp?.status;
    const state   = safeStr(status?.type?.state, 'pre');
    const desc    = safeStr(status?.type?.description);
    const phase   = phaseFromStatus(state, desc);

    // 2. Parse competitors
    const comps: any[] = comp?.competitors ?? [];
    const wasComp = comps.find((c: any) => c?.id === TEAM_ID);
    const oppComp = comps.find((c: any) => c?.id !== TEAM_ID);

    function buildTeam(c: any): GameTeam {
      return {
        id:           safeStr(c?.id),
        name:         safeStr(c?.team?.shortDisplayName ?? c?.team?.name),
        abbreviation: safeStr(c?.team?.abbreviation),
        score:        parseFloat(safeStr(c?.score, '0')) || 0,
        isHome:       c?.homeAway === 'home',
        winner:       !!c?.winner,
        logo:         safeStr(c?.team?.logo),
        color:        safeStr(c?.team?.color, '5a1414'),
      };
    }

    const washington = buildTeam(wasComp);
    const opponent   = buildTeam(oppComp);

    // 3. Kickoff time + network (from scoreboard)
    const kickoffIso = safeStr(comp?.date ?? event?.date);
    const kickoffDisplay = kickoffIso
      ? new Date(kickoffIso).toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true,
          timeZone: 'America/New_York',
        }) + ' ET'
      : 'TBD';

    const broadcast  = comp?.broadcasts?.[0];
    const network    = safeStr(broadcast?.names?.[0] ?? broadcast?.market?.type, '');

    // 4. Fetch full game summary for plays + situation
    const summary = await fetchJson(`${BASE}/summary?event=${gameId}`) as any;

    // Venue from gameInfo
    const venueInfo = summary?.gameInfo?.venue;
    const venue     = safeStr(venueInfo?.fullName, '');

    // Network from summary broadcasts if not found above
    const summaryBroadcasts = summary?.header?.competitions?.[0]?.broadcasts ?? [];
    const networkFinal = network ||
      safeStr(summaryBroadcasts?.[0]?.names?.[0] ?? summaryBroadcasts?.[0]?.media?.shortName, 'ESPN');

    // Current period + clock from summary header
    const headerComp = summary?.header?.competitions?.[0];
    const headerStatus = headerComp?.status ?? status;
    const period     = headerStatus?.period ?? status?.period ?? 1;
    const clock      = safeStr(headerStatus?.displayClock ?? status?.displayClock, '0:00');

    // 5. Situation (live only)
    let situation: GameSituation | null = null;
    const sit = comp?.situation ?? summary?.situation;
    if (sit && phase === 'live') {
      situation = {
        down:                   sit.down ?? 0,
        distance:               sit.distance ?? 0,
        yardLine:               sit.yardLine ?? 0,
        downDistanceText:       safeStr(sit.downDistanceText),
        possessionTeamId:       safeStr(sit.possession?.id ?? sit.possessionTeam?.id),
        isWashingtonPossession: safeStr(sit.possession?.id ?? sit.possessionTeam?.id) === TEAM_ID,
      };
    }

    // 6. Collect all plays (current drive + previous drives, newest first)
    const drives = summary?.drives ?? {};
    const allPlays: GamePlay[] = [];

    const currentPlays: any[] = drives?.current?.plays ?? [];
    for (const p of [...currentPlays].reverse()) {
      allPlays.push(buildPlay(p, TEAM_ID));
    }

    const previousDrives: any[] = drives?.previous ?? [];
    for (const drive of [...previousDrives].reverse()) {
      for (const p of [...(drive?.plays ?? [])].reverse()) {
        allPlays.push(buildPlay(p, TEAM_ID));
        if (allPlays.length >= 20) break;
      }
      if (allPlays.length >= 20) break;
    }

    const recentPlays = allPlays.slice(0, 10);

    // 7. Scoring plays (from summary, already in order)
    const rawScoring: any[] = summary?.scoringPlays ?? [];
    const scoringPlays: GamePlay[] = rawScoring.map(p => ({
      ...buildPlay(p, TEAM_ID),
      wasScore: p?.homeScore ?? 0,   // ESPN uses home/away keys
      oppScore: p?.awayScore ?? 0,
    }));

    return {
      gameId,
      phase,
      kickoffIso,
      kickoffDisplay,
      network:       networkFinal,
      venue,
      washington,
      opponent,
      period,
      periodDisplay: periodDisplay(period, phase),
      clock,
      situation,
      recentPlays,
      scoringPlays,
    };
  } catch (err) {
    console.warn('[gameday] detection failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
