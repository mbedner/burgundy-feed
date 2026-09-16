// ─── Push Subscription API ────────────────────────────────────────────────────
// POST /api/push-subscribe
//   Body: { action: 'subscribe', subscription: PushSubscription, type: NotificationType }
//       | { action: 'unsubscribe', endpoint: string }
//       | { action: 'publicKey' }
//
// Returns:
//   { ok: true }  on success
//   { ok: false, error: string } on failure
//   { ok: true, publicKey: string } for publicKey action

import type { APIRoute } from 'astro';
import type { PushSubscription, NotificationType } from '../../lib/push';
import { savePushSubscription, deletePushSubscription } from '../../lib/kv';

function getKv(locals: any): KVNamespace | null {
  return (locals as any).runtime?.env?.ARTICLES_KV ?? (locals as any).ARTICLES_KV ?? null;
}

function getEnv(locals: any, key: string): string {
  return (locals as any).runtime?.env?.[key] ?? (locals as any)[key] ?? '';
}

export const POST: APIRoute = async ({ request, locals }) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers });
  }

  if (body?.action === 'publicKey') {
    const pubKey = getEnv(locals, 'VAPID_PUBLIC_KEY');
    if (!pubKey) return new Response(JSON.stringify({ ok: false, error: 'VAPID not configured' }), { status: 503, headers });
    return new Response(JSON.stringify({ ok: true, publicKey: pubKey }), { headers });
  }

  const kv = getKv(locals);
  if (!kv) return new Response(JSON.stringify({ ok: false, error: 'KV unavailable' }), { status: 503, headers });

  if (body?.action === 'subscribe') {
    const sub  = body.subscription as PushSubscription | undefined;
    const type = body.type as NotificationType | undefined;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing subscription fields' }), { status: 400, headers });
    }
    if (type !== 'breaking' && type !== 'digest') {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid type' }), { status: 400, headers });
    }
    await savePushSubscription(kv, { subscription: sub, type, createdAt: new Date().toISOString() });
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  if (body?.action === 'unsubscribe') {
    const endpoint = body.endpoint as string | undefined;
    if (!endpoint) return new Response(JSON.stringify({ ok: false, error: 'Missing endpoint' }), { status: 400, headers });
    await deletePushSubscription(kv, endpoint);
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  return new Response(JSON.stringify({ ok: false, error: 'Unknown action' }), { status: 400, headers });
};

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
