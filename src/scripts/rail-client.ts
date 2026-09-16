// ─── Client-side right-rail data fetching ────────────────────────────────────
// ESPN's Akamai CDN blocks Cloudflare Workers egress IPs with 403, so server-
// side fetches for injury report and opponent preview always return empty.
// This module runs in the visitor's browser where the block doesn't apply.

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const WAS_ID = '28';

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

const STATUS_COLOR: Record<string, string> = {
  out:             '#ef4444',
  injured_reserve: '#ef4444',
  doubtful:        '#f97316',
  questionable:    '#eab308',
  'day-to-day':    'var(--text-3)',
};
const STATUS_SHORT: Record<string, string> = {
  out:             'OUT',
  injured_reserve: 'IR',
  doubtful:        'D',
  questionable:    'Q',
  'day-to-day':    'DTD',
};
const SHOW_STATUSES = new Set([
  'questionable','doubtful','out','injured_reserve','day-to-day','suspension','pup','nfi',
]);
const STATUS_ORDER: Record<string, number> = {
  out: 0, injured_reserve: 1, doubtful: 2, questionable: 3, 'day-to-day': 4,
};

// ─── Schedule (must match src/config/schedule.ts UPCOMING_SCHEDULE) ──────────
interface ScheduleGame { week: string; opponent: string; date: string; home: boolean | null; tv: string; time: string; result?: string; }
const SCHEDULE: ScheduleGame[] = [
  { week: 'W1',  opponent: 'Philadelphia', date: '2026-09-13', home: false, tv: 'FOX',         time: '4:25 PM ET', result: 'L' },
  { week: 'W2',  opponent: 'Dallas',       date: '2026-09-20', home: false, tv: 'FOX',         time: '4:25 PM ET' },
  { week: 'W3',  opponent: 'Seattle',      date: '2026-09-27', home: true,  tv: 'FOX',         time: '1:00 PM ET' },
  { week: 'W4',  opponent: 'Indianapolis', date: '2026-10-04', home: true,  tv: 'NFL Network', time: '9:30 AM ET' },
  { week: 'W5',  opponent: 'NY Giants',    date: '2026-10-11', home: true,  tv: 'FOX',         time: '1:00 PM ET' },
  { week: 'W6',  opponent: 'SF 49ers',     date: '2026-10-19', home: false, tv: 'ESPN/ABC',    time: '8:15 PM ET' },
  { week: 'W7',  opponent: 'BYE',          date: '2026-10-26', home: null,  tv: '',            time: '' },
  { week: 'W8',  opponent: 'Arizona',      date: '2026-11-02', home: true,  tv: 'FOX',         time: '1:00 PM ET' },
  { week: 'W9',  opponent: 'Philadelphia', date: '2026-11-08', home: true,  tv: 'NBC',         time: '8:20 PM ET' },
  { week: 'W10', opponent: 'Tennessee',    date: '2026-11-15', home: false, tv: 'CBS',         time: '1:00 PM ET' },
  { week: 'W11', opponent: 'NY Giants',    date: '2026-11-19', home: false, tv: 'Prime Video', time: '8:15 PM ET' },
  { week: 'W12', opponent: 'Houston',      date: '2026-11-29', home: true,  tv: 'FOX',         time: '1:00 PM ET' },
  { week: 'W13', opponent: 'Cincinnati',   date: '2026-12-06', home: true,  tv: 'ESPN/ABC',    time: '8:15 PM ET' },
  { week: 'W14', opponent: 'Atlanta',      date: '2026-12-13', home: false, tv: 'FOX',         time: '1:00 PM ET' },
  { week: 'W15', opponent: 'LA Rams',      date: '2026-12-20', home: true,  tv: 'NBC',         time: '8:20 PM ET' },
  { week: 'W16', opponent: 'Minnesota',    date: '2026-12-27', home: false, tv: 'FOX',         time: '1:00 PM ET' },
  { week: 'W17', opponent: 'Jacksonville', date: '2027-01-04', home: true,  tv: 'FOX',         time: '1:00 PM ET' },
];

function shortDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', weekday: 'short',
  });
}

async function renderOpponent(): Promise<void> {
  const mount = document.getElementById('rail-opponent-mount');
  if (!mount) return; // SSR already rendered it

  const now = Date.now();
  const next = SCHEDULE.find(g => {
    if (g.opponent === 'BYE' || g.result !== undefined) return false;
    const ms = new Date(g.date + 'T12:00:00').getTime();
    const days = (ms - now) / 86_400_000;
    return days >= 0 && days <= 13;
  });
  if (!next) return;

  const teamId = OPPONENT_ESPN_ID[next.opponent];
  if (!teamId) return;

  const daysUntil = Math.max(0, Math.ceil(
    (new Date(next.date + 'T12:00:00').getTime() - now) / 86_400_000,
  ));

  let record = '0-0', standing = '', logo = '';
  try {
    const res = await fetch(`${BASE}/teams/${teamId}`, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const d = await res.json() as any;
      const t = d?.team ?? {};
      record   = t.record?.items?.[0]?.summary ?? '0-0';
      standing = t.standingSummary ?? '';
      logo     = t.logos?.[0]?.href ?? '';
    }
  } catch { /* render without record */ }

  const ha       = next.home ? 'vs.' : 'at';
  const dayLabel = daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`;

  const section = document.createElement('div');
  section.className = 'rail-section';
  section.innerHTML = `
    <div class="module">
      <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);padding-bottom:10px;border-bottom:1px solid var(--border);margin-bottom:12px">Next Opponent</div>
      <div class="opp-card" style="display:flex;align-items:center;gap:10px">
        ${logo ? `<img src="${logo}" alt="${next.opponent}" width="40" height="40" loading="lazy" style="width:40px;height:40px;object-fit:contain;flex-shrink:0" />` : ''}
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--text);display:flex;align-items:baseline;gap:4px;margin-bottom:2px">
            <span style="font-size:10px;font-weight:500;color:var(--text-3);text-transform:uppercase">${ha}</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${next.opponent}</span>
          </div>
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">${record}${standing ? ' · ' + standing : ''}</div>
          <div style="display:flex;align-items:center;gap:6px;font-size:10px;flex-wrap:wrap">
            <span style="font-weight:700;color:var(--accent)">${dayLabel}</span>
            <span style="color:var(--text-3)">${shortDate(next.date)}</span>
            ${next.tv && next.tv !== 'TBD' ? `<span style="color:var(--text-4);padding:1px 4px;background:var(--surface-2);border-radius:3px;font-size:9px;font-weight:600">${next.tv}</span>` : ''}
          </div>
        </div>
      </div>
    </div>`;

  mount.replaceWith(section);
}

async function renderInjuries(): Promise<void> {
  const mount = document.getElementById('rail-injury-mount');
  if (!mount) return; // SSR already rendered it

  let players: any[] = [];
  try {
    const res = await fetch(
      `${BASE}/teams/${WAS_ID}?enable=roster,injuries,stats`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return;
    const data = await res.json() as any;
    const athletes: any[] = data?.team?.athletes ?? [];
    players = athletes
      .filter((a: any) => SHOW_STATUSES.has(a?.status?.type ?? ''))
      .map((a: any) => {
        const inj = a.injuries?.[0] ?? null;
        const det = inj?.details ?? {};
        return {
          position:   a.position?.abbreviation ?? '?',
          shortName:  a.shortName ?? a.displayName ?? '?',
          injuryType: det.type ?? '',
          status:     a.status?.name ?? '',
          statusType: a.status?.type ?? '',
        };
      })
      .sort((a: any, b: any) =>
        (STATUS_ORDER[a.statusType] ?? 9) - (STATUS_ORDER[b.statusType] ?? 9),
      );
  } catch { return; }

  if (players.length === 0) return;

  const rows = players.map((p: any) => {
    const color = STATUS_COLOR[p.statusType] ?? 'var(--text-4)';
    const tag   = STATUS_SHORT[p.statusType] ?? p.status;
    return `<div style="display:grid;grid-template-columns:26px 1fr auto 32px;gap:4px;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);font-size:11px">
      <span style="font-size:9px;font-weight:700;color:var(--text-4);text-transform:uppercase">${p.position}</span>
      <span style="font-weight:500;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.shortName}</span>
      <span style="font-size:10px;color:var(--text-4);text-align:right;white-space:nowrap">${p.injuryType || '—'}</span>
      <span style="font-size:9px;font-weight:800;text-align:right;letter-spacing:.04em;color:${color}">${tag}</span>
    </div>`;
  }).join('');

  const section = document.createElement('div');
  section.className = 'rail-section';
  section.innerHTML = `
    <div class="module">
      <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);padding-bottom:10px;border-bottom:1px solid var(--border);margin-bottom:12px">Injury Report</div>
      <div>${rows}</div>
    </div>`;

  mount.replaceWith(section);
}

async function renderStandings(): Promise<void> {
  const mount = document.getElementById('rail-standings-mount');
  if (!mount) return;

  const NFC_EAST = new Set([
    'Washington Commanders', 'Dallas Cowboys',
    'Philadelphia Eagles', 'New York Giants',
  ]);

  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/v2/sports/football/nfl/standings',
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return;
    const data = await res.json() as any;

    const raw: any[] = [];
    for (const conf of (data.children || [])) {
      for (const div of (conf.children || [])) {
        for (const e of (div.standings?.entries || [])) {
          if (NFC_EAST.has(e.team?.displayName)) raw.push(e);
        }
      }
      // Flat path (some API versions)
      for (const e of (conf.standings?.entries || [])) {
        if (NFC_EAST.has(e.team?.displayName)) raw.push(e);
      }
    }

    const seen = new Set<string>();
    const teams = raw
      .filter(e => { const k = e.team?.displayName; if (seen.has(k)) return false; seen.add(k); return true; })
      .map(e => {
        const s = Object.fromEntries((e.stats || []).map((x: any) => [x.name, x.displayValue]));
        return {
          abbr:  e.team.abbreviation as string,
          wins:  Number(s.wins   ?? 0),
          losses:Number(s.losses ?? 0),
          gb:    s.gamesBehind ?? '—',
          pct:   s.winPercent  ?? '.000',
          isWas: e.team.displayName === 'Washington Commanders',
        };
      })
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

    if (teams.length < 2) return;

    const HDR = `font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);padding-bottom:10px;border-bottom:1px solid var(--border);margin-bottom:12px`;
    const COL_HDR = `display:grid;grid-template-columns:1fr 22px 22px 36px;gap:4px;align-items:center;padding:0 0 5px;border-bottom:1px solid var(--border);margin-bottom:0`;
    const COL_LBL = `font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-4)`;
    const ROW = `display:grid;grid-template-columns:1fr 22px 22px 36px;gap:4px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px`;

    const colHeaders = `<div style="${COL_HDR}">
      <span></span>
      <span style="${COL_LBL};text-align:center">W</span>
      <span style="${COL_LBL};text-align:center">L</span>
      <span style="${COL_LBL};text-align:right">PCT</span>
    </div>`;

    const rows = teams.map(t => {
      const nameStyle = t.isWas
        ? `font-weight:800;color:var(--accent)`
        : `font-weight:600;color:var(--text-2)`;
      return `<div style="${ROW}${t.isWas ? ';background:transparent' : ''}">
        <span style="${nameStyle}">${t.abbr}</span>
        <span style="text-align:center;font-variant-numeric:tabular-nums;color:var(--text-2)">${t.wins}</span>
        <span style="text-align:center;font-variant-numeric:tabular-nums;color:var(--text-2)">${t.losses}</span>
        <span style="text-align:right;font-size:10px;color:var(--text-4);font-variant-numeric:tabular-nums">${t.pct}</span>
      </div>`;
    }).join('');

    const section = document.createElement('div');
    section.className = 'rail-section';
    section.innerHTML = `<div class="module">
      <div style="${HDR}">NFC East</div>
      ${colHeaders}${rows}
    </div>`;

    mount.replaceWith(section);
  } catch { /* silent */ }
}

export async function railClientInit(): Promise<void> {
  await Promise.all([renderOpponent(), renderInjuries(), renderStandings()]);
}
