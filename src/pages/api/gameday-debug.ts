// Diagnostic endpoint — returns raw ESPN scoreboard + detectGameDay result.
// Visit /api/gameday-debug to see what's happening from inside Cloudflare's network.
// Remove this file once game day mode is confirmed working.
import type { APIRoute } from 'astro';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const TEAM_ID = '28';

export const GET: APIRoute = async () => {
  const results: Record<string, unknown> = {};

  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).replace(/-/g, '');
    results.today = today;
    results.nowUtc = new Date().toISOString();

    const res = await fetch(`${BASE}/scoreboard?dates=${today}`, { signal: AbortSignal.timeout(8000) });
    results.scoreboardStatus = res.status;
    results.scoreboardOk = res.ok;

    if (res.ok) {
      const board = await res.json() as any;
      const events: any[] = board?.events ?? [];
      results.totalEvents = events.length;

      const wasEvent = events.find(e =>
        e?.competitions?.[0]?.competitors?.some((c: any) => c?.id === TEAM_ID),
      );

      if (wasEvent) {
        const comp = wasEvent.competitions[0];
        const status = comp?.status;
        results.wasGame = {
          id:       wasEvent.id,
          name:     wasEvent.name,
          date:     comp?.date ?? wasEvent.date,
          state:    status?.type?.state,
          desc:     status?.type?.description,
          competitors: comp?.competitors?.map((c: any) => ({
            id:    c.id,
            abbr:  c.team?.abbreviation,
            score: c.score,
            home:  c.homeAway,
          })),
        };
      } else {
        results.wasGame = null;
        results.eventNames = events.map(e => e.name);
      }
    } else {
      results.scoreboardBody = await res.text();
    }
  } catch (err) {
    results.error = err instanceof Error ? err.message : String(err);
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
