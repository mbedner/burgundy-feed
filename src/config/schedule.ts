// ─── Schedule & Important Dates ───────────────────────────────────────────────
// Update these manually each season or wire up a free API later.
// The site renders these statically — no live fetch needed.

export const IMPORTANT_DATES = [
  { label: 'NFL Draft',           date: '2025-04-24', note: 'Rounds 1–3 in Green Bay' },
  { label: 'Draft (Rounds 4–7)', date: '2025-04-26', note: 'Green Bay' },
  { label: 'OTA Begin',           date: '2025-05-27', note: 'Estimated' },
  { label: 'Mandatory Minicamp', date: '2025-06-10', note: 'Estimated' },
  { label: 'Training Camp',       date: '2025-07-22', note: 'Ashburn, VA — est. open date' },
  { label: 'Preseason Opens',     date: '2025-08-07', note: 'TBD' },
  { label: 'Regular Season',      date: '2025-09-04', note: 'Week 1 TBD' },
  { label: 'Trade Deadline',      date: '2025-11-04', note: '4 PM ET' },
  { label: 'Bye Week',            date: '2025-11-09', note: 'Week 10 — est.' },
  { label: 'Salary Cap Deadline', date: '2026-03-14', note: 'Contract year begins' },
];

export const UPCOMING_SCHEDULE = [
  // ── Preseason (estimated, update once schedule releases) ──────────────────
  { week: 'PS1', opponent: 'TBD',            date: '2025-08-07', home: true,  tv: 'TBD', time: 'TBD' },
  { week: 'PS2', opponent: 'TBD',            date: '2025-08-14', home: false, tv: 'TBD', time: 'TBD' },
  { week: 'PS3', opponent: 'TBD',            date: '2025-08-21', home: true,  tv: 'TBD', time: 'TBD' },
  // ── Regular Season ────────────────────────────────────────────────────────
  { week: 'W1',  opponent: 'TBD',            date: '2025-09-07', home: true,  tv: 'TBD', time: 'TBD' },
  { week: 'W2',  opponent: 'TBD',            date: '2025-09-14', home: false, tv: 'TBD', time: 'TBD' },
  { week: 'W3',  opponent: 'TBD',            date: '2025-09-21', home: true,  tv: 'TBD', time: 'TBD' },
  { week: 'W4',  opponent: 'TBD',            date: '2025-09-28', home: false, tv: 'TBD', time: 'TBD' },
  { week: 'W5',  opponent: 'TBD',            date: '2025-10-05', home: true,  tv: 'TBD', time: 'TBD' },
  { week: 'W6',  opponent: 'TBD',            date: '2025-10-12', home: false, tv: 'TBD', time: 'TBD' },
  { week: 'W7',  opponent: 'TBD',            date: '2025-10-19', home: true,  tv: 'TBD', time: 'TBD' },
  { week: 'W8',  opponent: 'TBD',            date: '2025-10-26', home: false, tv: 'TBD', time: 'TBD' },
  { week: 'W9',  opponent: 'TBD',            date: '2025-11-02', home: true,  tv: 'TBD', time: 'TBD' },
  { week: 'W10', opponent: 'BYE',            date: '2025-11-09', home: null,  tv: '',    time: '' },
  { week: 'W11', opponent: 'TBD',            date: '2025-11-16', home: true,  tv: 'TBD', time: 'TBD' },
  { week: 'W12', opponent: 'TBD',            date: '2025-11-23', home: false, tv: 'TBD', time: 'TBD' },
  { week: 'W13', opponent: 'TBD',            date: '2025-11-27', home: true,  tv: 'TBD', time: 'TBD' },
  { week: 'W14', opponent: 'TBD',            date: '2025-12-07', home: false, tv: 'TBD', time: 'TBD' },
  { week: 'W15', opponent: 'TBD',            date: '2025-12-14', home: true,  tv: 'TBD', time: 'TBD' },
  { week: 'W16', opponent: 'TBD',            date: '2025-12-21', home: false, tv: 'TBD', time: 'TBD' },
  { week: 'W17', opponent: 'TBD',            date: '2025-12-28', home: true,  tv: 'TBD', time: 'TBD' },
  { week: 'W18', opponent: 'TBD',            date: '2026-01-04', home: false, tv: 'TBD', time: 'TBD' },
];

// ─── Team Stats fallback (used when ESPN live fetch fails) ────────────────────
// The live ESPN fetch overwrites this at runtime via KV.
// Update these each offseason as a baseline; live data takes over once ingested.
export const TEAM_STATS = {
  season:            '2025',
  record:            '—',
  divisionRecord:    '—',
  offenseRank:       0,
  defenseRank:       0,
  pointsPerGame:     0,
  pointsAllowed:     0,
  passYardsPerGame:  0,
  rushYardsPerGame:  0,
  leaders: {
    passingYards:   { name: 'Jayden Daniels',     stat: 'Season upcoming' },
    rushingYards:   { name: 'Brian Robinson Jr.', stat: 'Season upcoming' },
    receivingYards: { name: 'Terry McLaurin',     stat: 'Season upcoming' },
    sacks:          { name: 'Daron Payne',         stat: 'Season upcoming' },
    interceptions:  { name: '—',                  stat: '—' },
    tackles:        { name: '—',                  stat: '—' },
  },
  lastUpdated: 'Live via ESPN',
};
