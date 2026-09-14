// ─── Client-side game day detection ──────────────────────────────────────────
// ESPN's Akamai CDN blocks Cloudflare Workers egress IPs with 403, so SSR
// detection always fails. This module runs in the visitor's browser where no
// such block exists, then creates and inserts the game day banner into the DOM.

const WAS_ID = '28';
const BASE   = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const SCORE_TYPES: Record<string, string> = {
  '67':'TD','68':'TD','72':'TD','59':'FG','63':'FG',
  '70':'Safety','57':'XP','58':'XP','69':'2PT',
};

export async function gdClientDetect(): Promise<void> {
  // SSR already rendered the banner — nothing to do
  if (document.getElementById('gdBanner')) return;

  try {
    const today = new Date()
      .toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      .replace(/-/g, '');

    const res = await fetch(`${BASE}/scoreboard?dates=${today}`);
    if (!res.ok) return;
    const board = await res.json() as any;

    const event = (board.events as any[] || []).find((e: any) =>
      e?.competitions?.[0]?.competitors?.some((c: any) => c?.id === WAS_ID),
    );
    if (!event) return;

    // Date guard
    const comp     = event.competitions[0];
    const eventDay = new Date(comp.date || event.date)
      .toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const todayDay = new Date()
      .toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    if (eventDay !== todayDay) return;

    // Phase
    const status = comp.status;
    const state  = status?.type?.state || 'pre';
    const desc   = (status?.type?.description || '').toLowerCase();
    const phase  = state === 'pre'  ? 'pregame'
                 : state === 'post' ? 'postgame'
                 : desc.includes('halftime') ? 'halftime' : 'live';

    // Teams
    const wasC     = (comp.competitors as any[]).find((c: any) => c.id === WAS_ID);
    const oppC     = (comp.competitors as any[]).find((c: any) => c.id !== WAS_ID);
    const wasScore = parseInt(wasC?.score || '0') || 0;
    const oppScore = parseInt(oppC?.score || '0') || 0;
    const wasAbbr  = wasC?.team?.abbreviation || 'WAS';
    const oppAbbr  = oppC?.team?.abbreviation || 'OPP';
    const wasLogo  = wasC?.team?.logos?.[0]?.href || '';
    const oppLogo  = oppC?.team?.logos?.[0]?.href || '';
    const wasWinner  = !!wasC?.winner;
    const wasIsHome  = wasC?.homeAway === 'home';
    const period   = status?.period || 1;
    const clock    = status?.displayClock || '0:00';
    const gameId   = event.id as string;
    const network  = comp.broadcasts?.[0]?.names?.[0] || '';
    const kickoffDisplay = new Date(comp.date || event.date).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York',
    }) + ' ET';

    // Fetch summary for plays + situation
    let scoringPlays: any[] = [];
    let recentPlays:  any[] = [];
    let situation:    { text: string; pos: string } | null = null;

    try {
      const sumRes = await fetch(`${BASE}/summary?event=${gameId}`);
      if (sumRes.ok) {
        const sum = await sumRes.json() as any;
        scoringPlays = sum.scoringPlays || [];

        const sit = comp.situation || sum.situation;
        if (sit && phase === 'live') {
          situation = {
            text: sit.downDistanceText || '',
            pos:  sit.possession?.id || sit.possessionTeam?.id || '',
          };
        }

        if (phase === 'live' || phase === 'halftime') {
          const drives = sum.drives || {};
          const all: any[] = [];
          for (const p of ([...(drives.current?.plays || [])].reverse())) all.push(p);
          for (const d of ([...(drives.previous || [])].reverse())) {
            for (const p of ([...(d.plays || [])].reverse())) {
              all.push(p);
              if (all.length >= 10) break;
            }
            if (all.length >= 10) break;
          }
          recentPlays = all.slice(0, 10);
        }
      }
    } catch { /* summary is non-critical */ }

    // Reveal hidden nav links
    const sl = document.getElementById('gd-subnav-link');
    const al = document.getElementById('gd-anchor-link');
    if (sl) (sl as HTMLElement).hidden = false;
    if (al) (al as HTMLElement).hidden = false;

    // Build and insert the banner
    const mount = document.getElementById('gd-mount');
    if (!mount) return;

    const isWin  = phase === 'postgame' && wasWinner;
    const isLoss = phase === 'postgame' && !wasWinner && wasScore !== oppScore;
    const periodLabel = phase === 'halftime' ? 'HALF' : period > 4 ? 'OT' : `Q${period}`;

    function playHtml(p: any, showScores: boolean): string {
      const isScore = !!p.scoringPlay;
      const badge   = isScore ? (SCORE_TYPES[p?.type?.id || ''] || '') : '';
      const per     = p?.period?.number || p?.period || '?';
      const clk     = p?.clock?.displayValue || p?.clock || '—';
      const wSc     = wasIsHome ? (p.homeScore ?? '') : (p.awayScore ?? '');
      const oSc     = wasIsHome ? (p.awayScore ?? '') : (p.homeScore ?? '');
      return `<div class="gd-play${isScore ? ' gd-play--scoring' : ''}">
        <span class="gd-play-meta">
          ${badge ? `<span class="gd-play-score-type">${badge}</span>` : ''}
          <span class="gd-play-period">Q${per}</span>
          <span class="gd-play-clock">${clk}</span>
          ${showScores && wSc !== '' ? `<span style="font-size:10px;color:#6a6058;margin-left:6px">${wasAbbr} ${wSc} – ${oppAbbr} ${oSc}</span>` : ''}
        </span>
        <span class="gd-play-text">${p?.text || ''}</span>
      </div>`;
    }

    const plays    = phase === 'postgame' ? scoringPlays : recentPlays;
    const playsHtml = (phase === 'live' || phase === 'halftime' || phase === 'postgame')
      ? `<div class="gd-plays">
          <div class="gd-plays-hd">${phase === 'postgame' ? 'Scoring Summary' : 'Play by Play'}</div>
          <div class="gd-plays-list" id="gdPlaysList">
            ${plays.map((p: any) => playHtml(p, phase === 'postgame')).join('')}
          </div>
        </div>`
      : '';

    const section = document.createElement('section');
    section.id = 'gameday';
    section.innerHTML = `
      <div class="gd-banner" id="gdBanner" data-game-id="${gameId}" data-phase="${phase}">
        <div class="gd-scorebar">
          <div class="gd-team gd-team--was">
            ${wasLogo ? `<img class="gd-logo" src="${wasLogo}" alt="${wasAbbr}" loading="eager" />` : ''}
            <div class="gd-team-text">
              <span class="gd-abbr">${wasAbbr}</span>
              <span class="gd-score" id="gdWasScore">${wasScore}</span>
            </div>
          </div>
          <div class="gd-middle">
            ${phase === 'pregame' ? `
              <div class="gd-pregame-info">
                <span class="gd-phase-label">GAME DAY</span>
                <span class="gd-kickoff">${kickoffDisplay}</span>
                ${network ? `<span class="gd-network">${network}</span>` : ''}
              </div>` : ''}
            ${phase === 'live' || phase === 'halftime' ? `
              <div class="gd-live-info">
                <span class="gd-live-dot"></span>
                <span class="gd-period" id="gdPeriod">${periodLabel}</span>
                ${phase === 'live' ? `<span class="gd-clock" id="gdClock">${clock}</span>` : ''}
              </div>` : ''}
            ${phase === 'postgame' ? `
              <div class="gd-final-info">
                <span class="gd-final-label">FINAL</span>
                <span class="gd-result gd-result--${isWin ? 'win' : isLoss ? 'loss' : 'tie'}">
                  ${isWin ? 'W' : isLoss ? 'L' : 'T'}
                </span>
              </div>` : ''}
          </div>
          <div class="gd-team gd-team--opp">
            <div class="gd-team-text gd-team-text--opp">
              <span class="gd-score" id="gdOppScore">${oppScore}</span>
              <span class="gd-abbr">${oppAbbr}</span>
            </div>
            ${oppLogo ? `<img class="gd-logo" src="${oppLogo}" alt="${oppAbbr}" loading="eager" />` : ''}
          </div>
        </div>
        ${situation ? `
          <div class="gd-situation" id="gdSituation">
            <span class="gd-possession">${situation.pos === WAS_ID ? '🏈 ' + wasAbbr : '🏈 ' + oppAbbr}</span>
            <span class="gd-down-dist">${situation.text}</span>
          </div>` : ''}
        ${playsHtml}
      </div>`;

    mount.replaceWith(section);

    // Set up live polling (reuses same logic as SSR banner)
    if (phase === 'live' || phase === 'halftime') {
      setInterval(async () => {
        try {
          const r = await fetch(`${BASE}/summary?event=${gameId}`);
          if (!r.ok) return;
          const d = await r.json() as any;
          const hc  = d?.header?.competitions?.[0];
          const st  = hc?.status;
          const comps = hc?.competitors ?? [];
          const wC  = comps.find((c: any) => c.id === WAS_ID);
          const oC  = comps.find((c: any) => c.id !== WAS_ID);
          if (wC) { const el = document.getElementById('gdWasScore'); if (el) el.textContent = wC.score ?? '0'; }
          if (oC) { const el = document.getElementById('gdOppScore'); if (el) el.textContent = oC.score ?? '0'; }
          const p2  = st?.period ?? 1;
          const c2  = st?.displayClock ?? '0:00';
          const isH = (st?.type?.description || '').toLowerCase().includes('halftime');
          const pel = document.getElementById('gdPeriod'); if (pel) pel.textContent = isH ? 'HALF' : p2 > 4 ? 'OT' : `Q${p2}`;
          const cel = document.getElementById('gdClock');  if (cel) cel.textContent = c2;
          const sit2 = hc?.situation;
          const sel  = document.getElementById('gdSituation');
          if (sel && sit2) {
            const pp = sel.querySelector('.gd-possession');
            const dd = sel.querySelector('.gd-down-dist');
            if (pp) pp.textContent = sit2.possessionTeam?.id === WAS_ID ? '🏈 ' + wasAbbr : '🏈 ' + oppAbbr;
            if (dd) dd.textContent = sit2.downDistanceText ?? '';
          }
          if (st?.type?.state === 'post') { window.location.reload(); }
        } catch { /* silent — retry next poll */ }
      }, 30_000);
    }

  } catch (e) {
    console.warn('[gd-client] detection failed:', (e as Error).message);
  }
}
