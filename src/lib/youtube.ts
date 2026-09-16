// ─── YouTube public RSS ingest (no API key required) ─────────────────────────
import type { VideoItem } from './types';

// Allowlisted channels — only these are ever fetched.
// Add a new entry here (with manual approval) to support another official source.
const YOUTUBE_CHANNELS = [
  {
    id:   'UCnnOPZOOxOcbctFOQFrFaiA',
    name: 'Washington Commanders',
  },
] as const;

const RSS_BASE = 'https://www.youtube.com/feeds/videos.xml?channel_id=';
const MAX_VIDEOS = 6;
const TIMEOUT_MS = 6000;

export async function fetchYouTubeVideos(): Promise<VideoItem[]> {
  const all: VideoItem[] = [];

  for (const channel of YOUTUBE_CHANNELS) {
    try {
      const res = await fetch(`${RSS_BASE}${channel.id}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'Accept': 'application/atom+xml, application/xml, text/xml' },
      });
      if (!res.ok) {
        console.warn(`[youtube] feed ${channel.id} returned ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const items = parseYouTubeFeed(xml);
      all.push(...items);
    } catch (err) {
      console.warn(`[youtube] fetch failed for ${channel.id}:`, (err as Error).message);
    }
  }

  // Deduplicate by videoId, newest first, cap at MAX_VIDEOS
  const seen = new Set<string>();
  return all
    .filter(v => { if (seen.has(v.videoId)) return false; seen.add(v.videoId); return true; })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, MAX_VIDEOS);
}

function parseYouTubeFeed(xml: string): VideoItem[] {
  const items: VideoItem[] = [];

  // Extract <entry> blocks
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let match: RegExpExecArray | null;

  while ((match = entryRe.exec(xml)) !== null) {
    const block = match[1];

    const videoId   = text(block, 'yt:videoId');
    const title     = text(block, 'media:title') || text(block, 'title');
    const published = text(block, 'published');

    if (!videoId || !title || !published) continue;

    // Thumbnail: prefer media:thumbnail url attribute, fall back to constructed URL
    const thumbAttr = /media:thumbnail[^>]+url="([^"]+)"/.exec(block);
    const thumbnailUrl = thumbAttr
      ? thumbAttr[1]
      : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    items.push({
      videoId,
      title:        decodeXml(title),
      url:          `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt:  published,
      thumbnailUrl,
    });
  }

  return items;
}

function text(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m  = re.exec(block);
  return m ? m[1].trim() : '';
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'");
}
