// ─── Opponent Preview ─────────────────────────────────────────────────────────
// Finds the next upcoming game and fetches basic info about the opponent.
// Shown in the right rail 0–13 days before each game.

import type { SeasonGame } from '../config/schedule';

export interface OpponentInfo {
  name:           string;
  abbreviation:   string;
  record:         string;
  standing:       string;
  color:          string;
  logo:           string;
  nextGame:       SeasonGame;
  daysUntil:      number;
}

// Maps schedule opponent names → ESPN team IDs
const OPPONENT_ESPN_ID: Record<string, string> = {
  'Philadelphia': '21',
  'Dallas':       '6',
  'Seattle':      '26',
  'Indianapolis': '11',
  'NY Giants':    '19',
  'SF 49ers':     '25',
  'LA Rams':      '14',
  'Cincinnati':   '4',
  'Arizona':      '22',
  'Tennessee':    '10',
  'Houston':      '34',
  'Atlanta':      '1',
  'Minnesota':    '16',
  'Jacksonville': '30',
};

export async function fetchOpponentPreview(schedule: SeasonGame[]): Promise<OpponentInfo | null> {
  const now = Date.now();

  // Find the next unplayed game within 14 days
  const next = schedule.find(g => {
    if (g.opponent === 'BYE' || g.result !== undefined) return false;
    const gameMs = new Date(g.date + 'T12:00:00').getTime();
    const daysAway = (gameMs - now) / 86_400_000;
    return daysAway >= 0 && daysAway <= 13;
  });
  if (!next) return null;

  const teamId = OPPONENT_ESPN_ID[next.opponent];
  if (!teamId) return null;

  const todayMidnight = new Date(new Date(now).setHours(0, 0, 0, 0));
  const gameMidnight  = new Date(next.date + 'T00:00:00');
  const daysUntil = Math.round((gameMidnight.getTime() - todayMidnight.getTime()) / 86_400_000);

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const data = await res.json() as any;
    const team = data?.team ?? {};

    const record  = team.record?.items?.[0]?.summary ?? '0-0';
    const standing = team.standingSummary ?? '';
    const color   = team.color ?? '333333';
    const logo    = team.logos?.[0]?.href ?? '';

    return {
      name:        team.displayName ?? next.opponent,
      abbreviation: team.abbreviation ?? '',
      record,
      standing,
      color,
      logo,
      nextGame:  next,
      daysUntil,
    };
  } catch {
    return null;
  }
}
