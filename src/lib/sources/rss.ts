// ─── RSS Feed Fetcher & Parser ────────────────────────────────────────────────
import { XMLParser } from 'fast-xml-parser';
import he from 'he';

export interface RawItem {
  title:       string;
  link:        string;
  author:      string | null;
  pubDate:     string;
  description: string | null;
  guid:        string | null;
  imageUrl:    string | null;
}

const parser = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  parseTagValue:       true,
  trimValues:          true,
});

function decodeHtml(s: string): string {
  return he.decode(s).replace(/<[^>]+>/g, '').trim();
}

function extractText(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') return decodeHtml(val);
  if (typeof val === 'object') {
    const v = val as Record<string, unknown>;
    if (v['#text']) return decodeHtml(String(v['#text']));
    if (v['_']) return decodeHtml(String(v['_']));
  }
  return null;
}

function extractLink(item: Record<string, unknown>): string {
  // RSS 2.0: <link> element
  if (item['link'] && typeof item['link'] === 'string') return item['link'];
  // Atom: <link href="...">
  if (item['link'] && typeof item['link'] === 'object') {
    const l = item['link'] as Record<string, unknown>;
    if (l['@_href']) return String(l['@_href']);
  }
  // GUID can be a URL
  if (item['guid']) {
    const g = extractText(item['guid']);
    if (g && g.startsWith('http')) return g;
  }
  return '';
}

function extractDate(item: Record<string, unknown>): string {
  const candidates = [
    item['pubDate'],
    item['published'],
    item['updated'],
    item['dc:date'],
  ];
  for (const c of candidates) {
    const s = extractText(c as unknown);
    if (s) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return new Date().toISOString();
}

function extractAuthor(item: Record<string, unknown>): string | null {
  const candidates = [
    item['author'],
    item['dc:creator'],
    item['creator'],
  ];
  for (const c of candidates) {
    const s = extractText(c as unknown);
    if (s) return s;
  }
  return null;
}

function attrUrl(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const url = (obj as Record<string, unknown>)['@_url'];
  if (typeof url === 'string' && url.startsWith('http')) return url;
  return null;
}

function rawHtml(val: unknown): string | null {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    const v = val as Record<string, unknown>;
    // Atom <content type="html"> parsed as { '@_type': 'html', '#text': '...' }
    if (typeof v['#text'] === 'string') return v['#text'];
    if (typeof v['_'] === 'string') return v['_'];
  }
  return null;
}

function firstImgSrc(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m && m[1].startsWith('http') ? m[1] : null;
}

function extractImage(item: Record<string, unknown>): string | null {
  // 1. media:content[@url] — Bleacher Report (when present), ESPN, NBC4
  const mc = item['media:content'];
  const mcFirst = Array.isArray(mc) ? mc[0] : mc;
  const mcUrl = attrUrl(mcFirst);
  if (mcUrl) return mcUrl;

  // 2. media:thumbnail[@url]
  const mt = item['media:thumbnail'];
  const mtFirst = Array.isArray(mt) ? mt[0] : mt;
  const mtUrl = attrUrl(mtFirst);
  if (mtUrl) return mtUrl;
  if (typeof mt === 'string' && mt.startsWith('http')) return mt;

  // 3. enclosure[@url] — Bleacher Report RSS 2.0 feeds
  //    fast-xml-parser may put all attributes directly on the object
  //    regardless of whether the element is self-closing
  const enc = item['enclosure'];
  if (enc) {
    // Could be a single object or array of objects
    const encFirst = Array.isArray(enc) ? enc[0] : enc;
    if (encFirst && typeof encFirst === 'object') {
      const e = encFirst as Record<string, unknown>;
      const url  = String(e['@_url']  ?? '');
      // Accept any enclosure with an http URL (type check too loose with image/jpg vs image/jpeg)
      if (url.startsWith('http')) return url;
    }
  }

  // 4. Scrape <img src> from raw HTML in description, content, or summary
  //    Covers Atom feeds (Hogs Haven) where image is inside <content> CDATA
  for (const field of ['description', 'content', 'summary']) {
    const src = firstImgSrc(rawHtml(item[field]) ?? '');
    if (src) return src;
  }

  return null;
}

export async function fetchRssFeed(
  url: string,
  timeoutMs = 8000,
): Promise<RawItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'CommandersWire/1.0 (+https://commanders-wire.pages.dev; news aggregator)',
        Accept: 'application/rss+xml, application/atom+xml, text/xml, */*',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = parser.parse(xml);

    // RSS 2.0 path
    const rss = parsed?.rss?.channel;
    if (rss) {
      const items = Array.isArray(rss.item) ? rss.item : rss.item ? [rss.item] : [];
      return items.map((item: Record<string, unknown>) => ({
        title:       extractText(item['title']) ?? '(no title)',
        link:        extractLink(item),
        author:      extractAuthor(item),
        pubDate:     extractDate(item),
        description: extractText(item['description']) ?? extractText(item['summary']),
        guid:        extractText(item['guid']),
        imageUrl:    extractImage(item),
      }));
    }

    // Atom path
    const feed = parsed?.feed;
    if (feed) {
      const entries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];
      return entries.map((entry: Record<string, unknown>) => ({
        title:       extractText(entry['title']) ?? '(no title)',
        link:        extractLink(entry),
        author:      extractAuthor(entry),
        pubDate:     extractDate(entry),
        description: extractText(entry['summary']) ?? extractText(entry['content']),
        guid:        extractText(entry['id']),
        imageUrl:    extractImage(entry),
      }));
    }

    return [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('abort')) throw new Error('Feed fetch timed out');
    throw new Error(`Feed fetch failed: ${msg}`);
  } finally {
    clearTimeout(timer);
  }
}
