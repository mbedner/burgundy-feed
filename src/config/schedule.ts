// ─── Schedule & Important Dates ───────────────────────────────────────────────

export interface SeasonGame {
  week:     string;
  opponent: string;
  date:     string;
  home:     boolean | null;
  tv:       string;
  time:     string;
  ws?:      number;   // Washington score (set after game)
  os?:      number;   // Opponent score   (set after game)
  result?:  'W' | 'L' | 'T';
}

// Dates shown in the sidebar key-dates section.
// Past dates are kept but displayed in a collapsible "Past" group by TeamDates.
// Do not list speculative dates without a source. Use `confirmed: false` when the
// exact date/time has not been officially announced — the UI renders it as "TBA".
export const IMPORTANT_DATES = [
  // ── Week 1 result ────────────────────────────────────────────────────────
  { label: 'Week 1 — at Philadelphia',  date: '2026-09-13', note: 'L 22–24 · FOX',   past: true  },
  // ── Upcoming primetime / notable games ────────────────────────────────────
  { label: 'Week 2 — at Dallas',        date: '2026-09-20', note: '4:25 PM · FOX' },
  { label: 'Week 3 — vs. Seattle',      date: '2026-09-27', note: '1:00 PM · FOX' },
  { label: 'London — vs. Indianapolis', date: '2026-10-04', note: 'Tottenham · 9:30 AM · NFLN' },
  { label: 'MNF — at San Francisco',    date: '2026-10-19', note: '8:15 PM · ESPN/ABC' },
  // ── Season milestones ─────────────────────────────────────────────────────
  { label: 'Bye Week',                  date: '2026-10-26', note: 'Week 7' },
  { label: 'Trade Deadline',            date: '2026-11-04', note: '4:00 PM ET' },
  { label: 'SNF — vs. Philadelphia',    date: '2026-11-01', note: '8:20 PM · NBC' },
  { label: 'TNF — at NY Giants',        date: '2026-11-12', note: '8:15 PM · Prime Video' },
  { label: 'MNF — vs. Cincinnati',      date: '2026-11-23', note: '8:15 PM · ESPN/ABC' },
  { label: 'Season Finale',             date: '2027-01-04', note: 'vs. Dallas · W18' },
];

// 2026 regular season — schedule released May 14, 2026 (source: Commanders.com / NFL.com)
// Set ws/os/result after each game is played.
export const UPCOMING_SCHEDULE: SeasonGame[] = [
  { week: 'W1',  opponent: 'Philadelphia', date: '2026-09-13', home: false, tv: 'FOX',         time: '4:25 PM ET', ws: 22, os: 24, result: 'L' },
  { week: 'W2',  opponent: 'Dallas',       date: '2026-09-20', home: false, tv: 'FOX',         time: '4:25 PM ET' },
  { week: 'W3',  opponent: 'Seattle',      date: '2026-09-27', home: true,  tv: 'FOX',         time: '1:00 PM ET' },
  { week: 'W4',  opponent: 'Indianapolis', date: '2026-10-04', home: true,  tv: 'NFL Network', time: '9:30 AM ET' },  // London
  { week: 'W5',  opponent: 'NY Giants',    date: '2026-10-11', home: true,  tv: 'FOX',         time: '1:00 PM ET' },
  { week: 'W6',  opponent: 'SF 49ers',     date: '2026-10-19', home: false, tv: 'ESPN/ABC',    time: '8:15 PM ET' },
  { week: 'W7',  opponent: 'BYE',          date: '2026-10-26', home: null,  tv: '',            time: '' },
  { week: 'W8',  opponent: 'Philadelphia', date: '2026-11-01', home: true,  tv: 'NBC',         time: '8:20 PM ET' },
  { week: 'W9',  opponent: 'LA Rams',      date: '2026-11-08', home: true,  tv: 'FOX',         time: '1:00 PM ET' },
  { week: 'W10', opponent: 'NY Giants',    date: '2026-11-12', home: false, tv: 'Prime',       time: '8:15 PM ET' },
  { week: 'W11', opponent: 'Cincinnati',   date: '2026-11-23', home: true,  tv: 'ESPN/ABC',    time: '8:15 PM ET' },
  { week: 'W12', opponent: 'Arizona',      date: '2026-11-29', home: false, tv: 'FOX',         time: '4:25 PM ET' },
  { week: 'W13', opponent: 'Tennessee',    date: '2026-12-06', home: false, tv: 'CBS',         time: '1:00 PM ET' },
  { week: 'W14', opponent: 'Houston',      date: '2026-12-13', home: true,  tv: 'CBS',         time: '1:00 PM ET' },
  { week: 'W15', opponent: 'Atlanta',      date: '2026-12-20', home: true,  tv: 'CBS',         time: '1:00 PM ET' },
  { week: 'W16', opponent: 'Minnesota',    date: '2026-12-26', home: false, tv: 'TBD',         time: 'TBD' },
  { week: 'W17', opponent: 'Jacksonville', date: '2027-01-02', home: false, tv: 'TBD',         time: 'TBD' },
  { week: 'W18', opponent: 'Dallas',       date: '2027-01-04', home: true,  tv: 'TBD',         time: 'TBD' },
];

// ─── 2025 Season Results (final) ──────────────────────────────────────────────
export const LAST_SEASON = {
  year: 2025,
  record: '5-12',
  divisionRecord: '3-3',
  playoffResult: 'Did not qualify',
  draftPick: '#7 overall (2026)',
  games: [
    { week: 'W1',  opponent: 'NY Giants',         home: true,  ws: 21, os: 6,  result: 'W' },
    { week: 'W2',  opponent: 'Green Bay',         home: false, ws: 18, os: 27, result: 'L' },
    { week: 'W3',  opponent: 'Las Vegas',         home: true,  ws: 41, os: 24, result: 'W' },
    { week: 'W4',  opponent: 'Atlanta',           home: false, ws: 27, os: 34, result: 'L' },
    { week: 'W5',  opponent: 'LA Chargers',       home: false, ws: 27, os: 10, result: 'W' },
    { week: 'W6',  opponent: 'Chicago',           home: true,  ws: 24, os: 25, result: 'L' },
    { week: 'W7',  opponent: 'Dallas',            home: false, ws: 22, os: 44, result: 'L' },
    { week: 'W8',  opponent: 'Kansas City',       home: false, ws: 7,  os: 28, result: 'L' },
    { week: 'W9',  opponent: 'Seattle',           home: true,  ws: 14, os: 38, result: 'L' },
    { week: 'W10', opponent: 'Detroit',           home: true,  ws: 22, os: 44, result: 'L' },
    { week: 'W11', opponent: 'Miami ✈',          home: false, ws: 13, os: 16, result: 'L' },
    { week: 'W12', opponent: 'BYE',              home: null,  ws: 0,  os: 0,  result: '—' },
    { week: 'W13', opponent: 'Denver',            home: true,  ws: 26, os: 27, result: 'L' },
    { week: 'W14', opponent: 'Minnesota',         home: false, ws: 0,  os: 31, result: 'L' },
    { week: 'W15', opponent: 'NY Giants',         home: false, ws: 29, os: 21, result: 'W' },
    { week: 'W16', opponent: 'Philadelphia',      home: true,  ws: 18, os: 29, result: 'L' },
    { week: 'W17', opponent: 'Dallas',            home: true,  ws: 23, os: 30, result: 'L' },
    { week: 'W18', opponent: 'Philadelphia',      home: false, ws: 24, os: 17, result: 'W' },
  ],
};

// ─── Team Stats — 2026 Season (live data from ESPN via ingest worker) ─────────
// This object is the fallback shown when the KV cache is cold or ESPN is down.
// The ingest worker overwrites it with live ESPN data every hour.
export const TEAM_STATS = {
  season:            '2026',
  record:            '0-1',
  divisionRecord:    '0-1',
  offenseRank:       16,
  defenseRank:       16,
  pointsPerGame:     22.0,
  pointsAllowed:     24.0,
  passYardsPerGame:  0.0,
  rushYardsPerGame:  0.0,
  leaders: {
    passingYards:   { name: 'Jayden Daniels',          stat: '—' },
    rushingYards:   { name: 'Jacory Croskey-Merritt',  stat: '—' },
    receivingYards: { name: 'Terry McLaurin',           stat: '—' },
    sacks:          { name: 'Odafe Oweh',               stat: '—' },
    interceptions:  { name: 'Mike Sainristil',          stat: '—' },
    tackles:        { name: 'Frankie Luvu',                stat: '—' },
  },
  lastUpdated: '2026 preseason',
  source: 'fallback' as const,
};
