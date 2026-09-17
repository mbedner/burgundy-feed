// ─── Reporter Voices Configuration ────────────────────────────────────────────
// Provider interface: extend ReporterFeedProvider to add authorized feed sources
// (e.g. Bluesky RSS, publisher feeds) without changing the component.

export interface Reporter {
  handle:   string;
  name:     string;
  outlet:   string;
  platform: 'x' | 'bluesky';
  profileUrl: string;
}

// Future: a provider can return ReporterPost[] for the live-feed path.
export interface ReporterPost {
  reporterHandle: string;
  text:           string;
  url:            string;
  postedAt:       string; // ISO 8601
  isRepost:       boolean;
}

export const REPORTER_CONFIG = {
  // No live-feed provider configured — directory links only.
  // Set to a class implementing { getPosts(): Promise<ReporterPost[]> } to enable the feed.
  feedProvider: null as null,

  reporters: [
    { handle: 'john_keim',      name: 'John Keim',       outlet: 'ESPN',                        platform: 'x', profileUrl: 'https://x.com/john_keim'      },
    { handle: 'JPFinlayNBCS',   name: 'JP Finlay',       outlet: 'NBC Sports Washington',       platform: 'x', profileUrl: 'https://x.com/JPFinlayNBCS'   },
    { handle: 'NickiJhabvala',  name: 'Nicki Jhabvala',  outlet: 'The Athletic',                platform: 'x', profileUrl: 'https://x.com/NickiJhabvala'  },
    { handle: 'BenStandig',     name: 'Ben Standig',     outlet: 'Last Man Standig',            platform: 'x', profileUrl: 'https://x.com/BenStandig'     },
    { handle: 'Mitch_Tischler', name: 'Mitch Tischler',  outlet: 'Monumental Sports Network',   platform: 'x', profileUrl: 'https://x.com/Mitch_Tischler' },
    { handle: 'ZachSelbyWC',    name: 'Zach Selby',      outlet: 'Commanders.com',              platform: 'x', profileUrl: 'https://x.com/ZachSelbyWC'    },
    { handle: 'DHarrison82',    name: 'David Harrison',  outlet: 'Locked On Commanders',        platform: 'x', profileUrl: 'https://x.com/DHarrison82'    },
    { handle: 'GrantPaulsen',    name: 'Grant Paulsen',   outlet: '106.7 The Fan',               platform: 'x', profileUrl: 'https://x.com/GrantPaulsen'   },
    { handle: 'jasonlacanfora', name: 'Jason La Canfora', outlet: 'CBS Sports',                 platform: 'x', profileUrl: 'https://x.com/jasonlacanfora'  },
  ] satisfies Reporter[],
};
