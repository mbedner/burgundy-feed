// ─── Schedule & Important Dates ───────────────────────────────────────────────

export const IMPORTANT_DATES = [
  { label: 'Offseason Workouts',   date: '2026-04-20', note: 'Phase 1 begins' },
  { label: 'NFL Draft — Round 1',  date: '2026-04-23', note: 'Pittsburgh, PA — Pick #7' },
  { label: 'Draft — Rounds 2–3',  date: '2026-04-24', note: 'Pittsburgh, PA' },
  { label: 'Draft — Rounds 4–7',  date: '2026-04-25', note: 'Pittsburgh, PA' },
  { label: 'Rookie Minicamp',      date: '2026-05-08', note: '' },
  { label: 'OTAs Begin',          date: '2026-05-27', note: '' },
  { label: 'Mandatory Minicamp',  date: '2026-06-16', note: 'June 16–18' },
  { label: 'Training Camp',       date: '2026-07-22', note: 'Ashburn, VA — est.' },
  { label: 'Preseason Opens',     date: '2026-08-06', note: 'TBD' },
  { label: 'Regular Season',      date: '2026-09-13', note: 'Week 1 at PHI' },
  { label: 'Schedule Release',    date: '2026-05-14', note: 'Released May 14' },
];

// 2026 regular season — schedule released May 14, 2026 (source: Commanders.com / NFL.com)
export const UPCOMING_SCHEDULE = [
  { week: 'W1',  opponent: 'Philadelphia Eagles',  date: '2026-09-13', home: false, tv: 'FOX',          time: '4:25 PM ET' },
  { week: 'W2',  opponent: 'Dallas Cowboys',        date: '2026-09-20', home: false, tv: 'FOX',          time: '4:25 PM ET' },
  { week: 'W3',  opponent: 'Seattle Seahawks',      date: '2026-09-27', home: true,  tv: 'FOX',          time: '1:00 PM ET' },
  { week: 'W4',  opponent: 'Indianapolis Colts ✈', date: '2026-10-04', home: true,  tv: 'NFL Network',  time: '9:30 AM ET' },  // London — Tottenham Hotspur Stadium
  { week: 'W5',  opponent: 'New York Giants',       date: '2026-10-11', home: true,  tv: 'FOX',          time: '1:00 PM ET' },
  { week: 'W6',  opponent: 'San Francisco 49ers',   date: '2026-10-19', home: false, tv: 'ESPN/ABC',     time: '8:15 PM ET' },
  { week: 'W7',  opponent: 'BYE',                   date: '2026-10-26', home: null,  tv: '',             time: '' },
  { week: 'W8',  opponent: 'Philadelphia Eagles',   date: '2026-11-01', home: true,  tv: 'NBC',          time: '8:20 PM ET' },
  { week: 'W9',  opponent: 'Los Angeles Rams',      date: '2026-11-08', home: true,  tv: 'FOX',          time: '1:00 PM ET' },
  { week: 'W10', opponent: 'New York Giants',       date: '2026-11-12', home: false, tv: 'Prime Video',  time: '8:15 PM ET' },
  { week: 'W11', opponent: 'Cincinnati Bengals',    date: '2026-11-23', home: true,  tv: 'ESPN/ABC',     time: '8:15 PM ET' },
  { week: 'W12', opponent: 'Arizona Cardinals',     date: '2026-11-29', home: false, tv: 'FOX',          time: '4:25 PM ET' },
  { week: 'W13', opponent: 'Tennessee Titans',      date: '2026-12-06', home: false, tv: 'CBS',          time: '1:00 PM ET' },
  { week: 'W14', opponent: 'Houston Texans',        date: '2026-12-13', home: true,  tv: 'CBS',          time: '1:00 PM ET' },
  { week: 'W15', opponent: 'Atlanta Falcons',       date: '2026-12-20', home: true,  tv: 'CBS',          time: '1:00 PM ET' },
  { week: 'W16', opponent: 'Minnesota Vikings',     date: '2026-12-26', home: false, tv: 'TBD',          time: 'TBD' },
  { week: 'W17', opponent: 'Jacksonville Jaguars',  date: '2027-01-02', home: false, tv: 'TBD',          time: 'TBD' },
  { week: 'W18', opponent: 'Dallas Cowboys',        date: '2027-01-04', home: true,  tv: 'TBD',          time: 'TBD' },
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

// ─── Team Stats — 2025 Final Season Stats ─────────────────────────────────────
export const TEAM_STATS = {
  season:            '2025',
  record:            '5-12',
  divisionRecord:    '3-3',
  offenseRank:       22,
  defenseRank:       27,
  pointsPerGame:     20.9,
  pointsAllowed:     26.5,
  passYardsPerGame:  195.8,
  rushYardsPerGame:  134.7,
  leaders: {
    passingYards:   { name: 'Marcus Mariota',         stat: '1,695 yds' },
    rushingYards:   { name: 'Jacory Croskey-Merritt', stat: '805 yds'   },
    receivingYards: { name: 'Deebo Samuel',            stat: '727 yds'   },
    sacks:          { name: 'Von Miller',              stat: '9.0'       },
    interceptions:  { name: 'Mike Sainristil',         stat: '4 INTs'    },
    tackles:        { name: 'Bobby Wagner',            stat: '162'       },
  },
  lastUpdated: '2025 final',
  source: 'fallback' as const,
};
