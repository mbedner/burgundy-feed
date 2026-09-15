// ─── Client-side game day detection ──────────────────────────────────────────
// ESPN's Akamai CDN blocks Cloudflare Workers egress IPs with 403, so SSR
// detection always fails. This module runs in the visitor's browser where no
// such block exists, then creates and inserts the game day banner into the DOM.

const DEFAULT_TEAM_ID   = '28';
const DEFAULT_TEAM_ABBR = 'WAS';
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

function parseFieldPos(sit: any, wasId: string, wasAbbr: string) {
  const rawPoss = sit.possessionText ?? '';
  const rawDt   = sit.downDistanceText ?? '';
  const pm = rawPoss.match(/^(\w+)\s+(\d+)$/) ?? rawDt.match(/at\s+(\w+)\s+(\d+)/i);
  let fp = 50;
  if (pm) {
    const t = pm[1].toUpperCase();
    const y = parseInt(pm[2]);
    const alt = wasAbbr === 'WAS' ? 'WSH' : wasAbbr === 'WSH' ? 'WAS' : '';
    fp = (t === wasAbbr || (alt && t === alt)) ? y : 100 - y;
  } else if (sit.yardLine) {
    fp = sit.possessionTeam?.id === wasId ? sit.yardLine : 100 - sit.yardLine;
  }
  fp = Math.max(0, Math.min(100, fp));
  const bx     = 60 + (fp / 100) * 480;
  const isWas  = sit.possessionTeam?.id === wasId;
  const fdp    = Math.max(3, Math.min(97, isWas ? fp + (sit.distance ?? 10) : fp - (sit.distance ?? 10)));
  const fdx    = 60 + (fdp / 100) * 480;
  return { bx, fdx, isWas };
}

function buildFieldSvg(bx: number, fdx: number, wasAbbr: string, oppAbbr: string, wasColor: string, oppColor: string): string {
  const stripes = Array.from({length: 10}, (_, i) =>
    `<rect x="${60+i*48}" y="0" width="48" height="72" fill="${i%2===0?'#2e7a14':'#1a4e08'}"/>`,
  ).join('');
  const ydLines = [108,156,204,252,348,396,444,492].map(x =>
    `<line x1="${x}" y1="0" x2="${x}" y2="72" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>`,
  ).join('');
  const ydNums = [10,20,30,40,50,40,30,20,10].map((n,i) =>
    `<text x="${108+i*48}" y="13" class="gd-yd-num" opacity="${n===50?'0.7':'0.5'}">${n}</text>`,
  ).join('');
  const bxR = Math.round(bx), fdxR = Math.round(fdx);
  return `<svg class="gd-field-svg" viewBox="0 0 600 72" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Field position">
  ${stripes}
  <rect x="0" y="0" width="60" height="72" fill="${wasColor}"/>
  <rect x="540" y="0" width="60" height="72" fill="${oppColor}"/>
  <text id="gdFieldHome" x="30" y="36" class="gd-ez-label">${wasAbbr}</text>
  <text id="gdFieldOpp"  x="570" y="36" class="gd-ez-label">${oppAbbr}</text>
  <line x1="60"  y1="0" x2="60"  y2="72" stroke="white" stroke-width="2"/>
  <line x1="540" y1="0" x2="540" y2="72" stroke="white" stroke-width="2"/>
  ${ydLines}
  <line x1="300" y1="0" x2="300" y2="72" stroke="rgba(255,255,255,0.55)" stroke-width="1.5"/>
  ${ydNums}
  <line id="gdFDLine" x1="${fdxR}" y1="0" x2="${fdxR}" y2="72" stroke="#facc15" stroke-width="2" stroke-dasharray="4,3" opacity="0.9"/>
  <text id="gdBall" x="${bxR}" y="45" font-size="14" text-anchor="middle" dominant-baseline="middle" style="user-select:none">🏈</text>
</svg>`;
}

const SCORE_TYPES: Record<string, string> = {
  '67':'TD','68':'TD','72':'TD','59':'FG','63':'FG',
  '70':'Safety','57':'XP','58':'XP','69':'2PT',
};

export async function gdClientDetect(): Promise<void> {
  // SSR already rendered the banner — nothing to do
  if (document.getElementById('gdBanner')) return;

  const teamParam = new URLSearchParams(window.location.search).get('team')?.toUpperCase() || null;

  try {
    const today = new Date()
      .toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      .replace(/-/g, '');

    const res = await fetch(`${BASE}/scoreboard?dates=${today}`);
    if (!res.ok) return;
    const board = await res.json() as any;

    const event = (board.events as any[] || []).find((e: any) =>
      e?.competitions?.[0]?.competitors?.some((c: any) =>
        teamParam
          ? c?.team?.abbreviation?.toUpperCase() === teamParam
          : c?.id === DEFAULT_TEAM_ID,
      ),
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
    const wasC     = (comp.competitors as any[]).find((c: any) =>
      teamParam ? c?.team?.abbreviation?.toUpperCase() === teamParam : c.id === DEFAULT_TEAM_ID,
    );
    const oppC     = (comp.competitors as any[]).find((c: any) => c !== wasC);
    const wasId    = wasC?.id ?? DEFAULT_TEAM_ID;
    const wasScore = parseInt(wasC?.score || '0') || 0;
    const oppScore = parseInt(oppC?.score || '0') || 0;
    const wasAbbr  = wasC?.team?.abbreviation?.toUpperCase() || DEFAULT_TEAM_ABBR;
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
    let liveSit: any = null;

    try {
      const sumRes = await fetch(`${BASE}/summary?event=${gameId}`);
      if (sumRes.ok) {
        const sum = await sumRes.json() as any;
        scoringPlays = sum.scoringPlays || [];

        const sit = comp.situation || sum.situation;
        if (sit && phase === 'live') {
          liveSit = sit;
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
    const wasDim = isLoss;
    const oppDim = isWin;
    const wasCaret = isWin  ? '&#9658;' : '';
    const oppCaret = isLoss ? '&#9658;' : '';
    const wasColor = wasC?.team?.color ? `#${wasC.team.color}` : '#9b1535';
    const oppColorVal = oppC?.team?.color ? `#${oppC.team.color}` : '#555555';
    const periodLabel = phase === 'halftime' ? 'HALF' : period > 4 ? 'OT' : `Q${period}`;

    let fieldHtml = '';
    let initPossText = '';
    if (liveSit) {
      const fp = parseFieldPos(liveSit, wasId, wasAbbr);
      initPossText = fp.isWas ? `🏈 ${wasAbbr}` : `🏈 ${oppAbbr}`;
      fieldHtml = buildFieldSvg(fp.bx, fp.fdx, wasAbbr, oppAbbr, wasColor, oppColorVal);
    }

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
      ? `<div class="gd-plays-list" id="gdPlaysList">
            ${plays.map((p: any) => playHtml(p, phase === 'postgame')).join('')}
          </div>`
      : '';

    const hasPlays = phase === 'live' || phase === 'halftime' || phase === 'postgame';

    const section = document.createElement('section');
    section.id = 'gameday';
    section.innerHTML = `
      <style>
        .gd-field{border-top:1px solid var(--gd-border,#eae8e4)}
        .gd-field-svg{display:block;width:100%;height:auto}
        .gd-ez-label{fill:rgba(255,255,255,0.75);font-size:10px;font-weight:800;font-family:system-ui,sans-serif;letter-spacing:.08em;text-anchor:middle;dominant-baseline:middle}
        .gd-yd-num{fill:white;font-size:8px;font-weight:700;font-family:system-ui,sans-serif;text-anchor:middle;dominant-baseline:hanging}
        .gd-field-info{display:flex;align-items:center;justify-content:center;gap:16px;padding:5px 20px;border-top:1px solid var(--gd-border,#eae8e4);font-size:12px;font-weight:600}
        .gd-field-info .gd-possession{color:#e8a820}
        .gd-field-info .gd-down-dist{color:var(--gd-text,#1a1918)}
      </style>
      <div class="gd-banner" id="gdBanner" data-game-id="${gameId}" data-phase="${phase}"
           style="--was-color:${wasColor};--opp-color:${oppColorVal}">
        <div class="gd-scorebar">
          <div class="gd-team gd-team--was">
            ${wasLogo ? `<img class="gd-logo" src="${wasLogo}" alt="${wasAbbr}" loading="eager" />` : ''}
            <div class="gd-team-text">
              <span class="gd-abbr">${wasAbbr}</span>
              <div class="gd-score-wrap${wasDim ? ' gd-score-wrap--dim' : ''}">
                ${wasCaret ? `<span class="gd-caret" aria-hidden="true">${wasCaret}</span>` : ''}
                <span class="gd-score" id="gdWasScore">${wasScore}</span>
              </div>
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
              </div>` : ''}
          </div>
          <div class="gd-team gd-team--opp">
            <div class="gd-team-text gd-team-text--opp">
              <span class="gd-abbr">${oppAbbr}</span>
              <div class="gd-score-wrap${oppDim ? ' gd-score-wrap--dim' : ''}">
                ${oppCaret ? `<span class="gd-caret" aria-hidden="true">${oppCaret}</span>` : ''}
                <span class="gd-score" id="gdOppScore">${oppScore}</span>
              </div>
            </div>
            ${oppLogo ? `<img class="gd-logo" src="${oppLogo}" alt="${oppAbbr}" loading="eager" />` : ''}
          </div>
        </div>
        ${fieldHtml ? `
          <div class="gd-field" id="gdSituation">
            ${fieldHtml}
            <div class="gd-field-info">
              <span class="gd-possession" id="gdPossession">${initPossText}</span>
              <span class="gd-down-dist" id="gdDownDist"></span>
            </div>
          </div>` : ''}
        ${hasPlays ? `
          <div class="gd-tabs" role="tablist">
            <button class="gd-tab gd-tab--active" role="tab" aria-selected="true" data-target="gdPanelSummary">
              ${phase === 'postgame' ? 'Scoring' : 'Plays'}
            </button>
          </div>
          <div class="gd-panel" id="gdPanelSummary" role="tabpanel">
            ${playsHtml}
          </div>` : ''}
      </div>`;

    mount.replaceWith(section);

    // Tab switching
    const banner = document.getElementById('gdBanner');
    if (banner) {
      banner.querySelectorAll<HTMLButtonElement>('.gd-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const target = tab.getAttribute('data-target');
          banner.querySelectorAll('.gd-tab').forEach(t => {
            t.classList.toggle('gd-tab--active', t === tab);
            t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
          });
          banner.querySelectorAll<HTMLElement>('.gd-panel').forEach(panel => {
            panel.hidden = panel.id !== target;
          });
        });
      });
    }

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
          const wC  = comps.find((c: any) => c.id === wasId);
          const oC  = comps.find((c: any) => c.id !== wasId);
          if (wC) { const el = document.getElementById('gdWasScore'); if (el) el.textContent = wC.score ?? '0'; }
          if (oC) { const el = document.getElementById('gdOppScore'); if (el) el.textContent = oC.score ?? '0'; }
          const p2  = st?.period ?? 1;
          const c2  = st?.displayClock ?? '0:00';
          const isH = (st?.type?.description || '').toLowerCase().includes('halftime');
          const pel = document.getElementById('gdPeriod'); if (pel) pel.textContent = isH ? 'HALF' : p2 > 4 ? 'OT' : `Q${p2}`;
          const cel = document.getElementById('gdClock');  if (cel) cel.textContent = c2;
          const sit2 = hc?.situation;
          if (sit2) {
            const fp2 = parseFieldPos(sit2, wasId, wasAbbr);
            const ballEl = document.getElementById('gdBall');
            const fdEl   = document.getElementById('gdFDLine');
            if (ballEl) ballEl.setAttribute('x', String(Math.round(fp2.bx)));
            if (fdEl)   { fdEl.setAttribute('x1', String(Math.round(fp2.fdx))); fdEl.setAttribute('x2', String(Math.round(fp2.fdx))); }
            const possEl = document.getElementById('gdPossession');
            const ddEl   = document.getElementById('gdDownDist');
            if (possEl) possEl.textContent = fp2.isWas ? `🏈 ${wasAbbr}` : `🏈 ${oppAbbr}`;
            if (ddEl)   ddEl.textContent = sit2.downDistanceText ?? '';
          }
          if (st?.type?.state === 'post') { window.location.reload(); }
        } catch { /* silent — retry next poll */ }
      }, 30_000);
    }

  } catch (e) {
    console.warn('[gd-client] detection failed:', (e as Error).message);
  }
}
