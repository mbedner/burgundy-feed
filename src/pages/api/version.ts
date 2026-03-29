// Lightweight endpoint returning the last ingest run timestamp.
// Used by the client to detect new content without fetching the full page.
import type { APIRoute } from 'astro';
import { readLastRun } from '../../lib/kv';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const runtime = (locals as any).runtime;
    const kv: KVNamespace | undefined =
      runtime?.env?.ARTICLES_KV ?? (locals as any).ARTICLES_KV;
    if (!kv) {
      return new Response(JSON.stringify({ version: null }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      });
    }
    const lastRun = await readLastRun(kv);
    return new Response(
      JSON.stringify({ version: lastRun?.id ?? null }),
      { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } },
    );
  } catch {
    return new Response(JSON.stringify({ version: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
