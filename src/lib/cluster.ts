// ─── Story Clustering ─────────────────────────────────────────────────────────
// Groups articles covering the same story into clusters.
// Uses title similarity, named-entity overlap, and publication-time proximity.
// All deterministic — no external service required.
//
// Design:
//   - Articles within 60% title similarity AND within 24h of each other → same cluster
//   - Each cluster gets a stable ID derived from its primary article's ID
//   - The primary article is the highest-scored original-reporting article in the cluster,
//     or the highest-scored article overall if none have isOriginalReporting
//   - All non-primary articles are marked as cluster members (shown if expanded)

import type { Article, ClusterMeta } from './types';

const CLUSTER_STOP = new Set([
  'that', 'this', 'with', 'from', 'have', 'will', 'been', 'they', 'their',
  'would', 'could', 'should', 'about', 'after', 'before', 'into', 'over',
  'then', 'than', 'when', 'what', 'which', 'were', 'also', 'more', 'just',
  'said', 'says', 'make', 'made', 'take', 'back', 'down', 'each', 'much',
  'some', 'does', 'come', 'team', 'game', 'year', 'next', 'last', 'first',
  'season', 'week', 'time', 'play', 'player', 'league', 'deal', 'news',
  'nfl', 'report', 'commanders', 'washington',
]);

function sigWords(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/)
      .filter(w => w.length > 3 && !CLUSTER_STOP.has(w))
  );
}

function similarity(wa: Set<string>, wb: Set<string>): number {
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) { if (wb.has(w)) shared++; }
  return shared / Math.min(wa.size, wb.size);
}

function articleSimilarity(a: Article, b: Article): number {
  // Title-only check first (fast path, higher threshold)
  const titleSim = similarity(sigWords(a.originalHeadline), sigWords(b.originalHeadline));
  if (titleSim >= SIMILARITY_THRESHOLD) return titleSim;
  // Fall back to combined title+summary (catches different-vocabulary same-story)
  const wa = sigWords(`${a.originalHeadline} ${a.summary ?? ''}`);
  const wb = sigWords(`${b.originalHeadline} ${b.summary ?? ''}`);
  return similarity(wa, wb);
}

function withinTimeWindow(a: Article, b: Article, maxHrs = 24): boolean {
  const diff = Math.abs(
    new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );
  return diff < maxHrs * 3_600_000;
}

const SIMILARITY_THRESHOLD = 0.35; // 35% significant-word overlap → same story (lower to catch summary-level matches)

export function clusterArticles(articles: Article[]): {
  articles: Article[];
  clusters: ClusterMeta[];
} {
  const assigned = new Array<number>(articles.length).fill(-1); // cluster index for each article
  const clusterGroups: number[][] = [];

  for (let i = 0; i < articles.length; i++) {
    if (assigned[i] !== -1) continue;

    // Start a new cluster with this article
    const newCluster: number[] = [i];
    assigned[i] = clusterGroups.length;

    for (let j = i + 1; j < articles.length; j++) {
      if (assigned[j] !== -1) continue;
      // Same source = same story only if exact URL match (handled by dedup); skip same-source pairs
      if (articles[i].sourceId === articles[j].sourceId) continue;
      const sim = articleSimilarity(articles[i], articles[j]);
      if (sim >= SIMILARITY_THRESHOLD && withinTimeWindow(articles[i], articles[j])) {
        newCluster.push(j);
        assigned[j] = clusterGroups.length;
      }
    }

    clusterGroups.push(newCluster);
  }

  // For each cluster, pick a primary article (best original reporting, then best score)
  const clusterMetas: ClusterMeta[] = [];
  const updatedArticles = [...articles];

  for (const group of clusterGroups) {
    if (group.length === 0) continue;

    const members = group.map(i => articles[i]);

    // Primary selection: prefer original reporting with highest score, else just highest score
    const originals = members.filter(a => a.isOriginalReporting);
    const pool      = originals.length > 0 ? originals : members;
    const primary   = pool.reduce((best, cur) => cur.score > best.score ? cur : best);

    const clusterId = primary.id;

    for (const idx of group) {
      updatedArticles[idx] = { ...articles[idx], clusterId };
    }

    clusterMetas.push({
      id:         clusterId,
      size:       group.length,
      primaryId:  primary.id,
      articleIds: members.map(a => a.id),
    });
  }

  return { articles: updatedArticles, clusters: clusterMetas };
}
