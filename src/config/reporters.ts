// ─── Reporter / X Feed Configuration ─────────────────────────────────────────
// Set xListUrl to a public X List URL to embed one list (preferred, cleanest).
// If xListUrl is null, the site falls back to embedding individual profiles.

export const REPORTER_CONFIG = {
  // Public X List URL — set this to your curated Commanders reporters list.
  // Create a list at x.com, make it public, and paste the URL here.
  // Example: 'https://twitter.com/i/lists/1234567890'
  xListUrl: null as string | null,

  // Fallback: individual handles shown when xListUrl is null
  handles: [
    { handle: 'john_keim',       name: 'John Keim',          outlet: 'ESPN' },
    { handle: 'JPFinlayNBCS',    name: 'JP Finlay',          outlet: 'NBC Sports Washington' },
    { handle: 'BenStandig',      name: 'Ben Standig',        outlet: 'The Athletic' },
    { handle: 'NickiJhabvala',   name: 'Nicki Jhabvala',     outlet: 'Washington Post' },
    { handle: 'Mitch_Tischler',  name: 'Mitch Tischler',     outlet: 'Commanders Wire' },
    { handle: 'ZachSelbyWC',     name: 'Zach Selby',         outlet: 'Commanders.com' },
    { handle: 'Sam4TR',          name: 'Sam Fortier',        outlet: 'Washington Post' },
  ],

  // Max embeds shown at once when using fallback mode (keep low for performance)
  maxEmbeds: 4,
};
