// ─── Injury Report ────────────────────────────────────────────────────────────
// Fetches Washington Commanders injury/practice report from ESPN's team endpoint.
// Only returns players with a meaningful injury status (not Active or Practice Squad).

export interface InjuredPlayer {
  id:           string;
  name:         string;
  shortName:    string;
  position:     string;
  status:       string;       // "Questionable", "Out", "Injured Reserve", "Day-To-Day"
  statusType:   string;       // "questionable", "out", "injured_reserve", "day-to-day"
  injuryType:   string;       // "Ankle", "Hamstring", etc.
  shortComment: string;
  returnDate:   string | null;
}

const SHOW_STATUSES = new Set([
  'questionable', 'doubtful', 'out', 'injured_reserve',
  'day-to-day', 'suspension', 'pup', 'nfi',
]);

export async function fetchInjuryReport(): Promise<InjuredPlayer[]> {
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/28?enable=roster,injuries,stats',
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return [];
    const data = await res.json() as any;
    const athletes: any[] = data?.team?.athletes ?? [];

    return athletes
      .filter(a => SHOW_STATUSES.has(a?.status?.type ?? ''))
      .map(a => {
        const inj = a.injuries?.[0] ?? null;
        const det = inj?.details ?? {};
        const pos = a.position?.abbreviation ?? '?';
        return {
          id:           String(a.id ?? ''),
          name:         String(a.displayName ?? ''),
          shortName:    String(a.shortName ?? a.displayName ?? ''),
          position:     pos,
          status:       String(a.status?.name ?? ''),
          statusType:   String(a.status?.type ?? ''),
          injuryType:   det.type ?? '',
          shortComment: inj?.shortComment ?? '',
          returnDate:   det.returnDate ?? null,
        };
      })
      .sort((a, b) => {
        const order: Record<string, number> = { out: 0, injured_reserve: 1, doubtful: 2, questionable: 3, 'day-to-day': 4 };
        return (order[a.statusType] ?? 9) - (order[b.statusType] ?? 9);
      });
  } catch {
    return [];
  }
}
