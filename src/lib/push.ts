// ─── Web Push Notification Helpers ───────────────────────────────────────────
// Implements RFC 8291 (message encryption) + RFC 8292 (VAPID)
// All crypto via the Web Crypto API — no Node.js dependencies, runs in Workers.
//
// Required env vars:
//   VAPID_PUBLIC_KEY  — base64url uncompressed P-256 public key (65 bytes)
//   VAPID_PRIVATE_KEY — base64url raw P-256 private scalar (32 bytes)
//   VAPID_SUBJECT     — mailto: address, e.g. mailto:admin@burgundyfeed.com
//
// Generate keys: npx web-push generate-vapid-keys

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string; // base64url-encoded uncompressed P-256 public key
    auth:   string; // base64url-encoded 16-byte auth secret
  };
}

export type NotificationType = 'breaking' | 'digest';

export interface StoredSubscription {
  subscription: PushSubscription;
  type:         NotificationType;
  createdAt:    string;
}

export interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
  tag?:  string;
}

// ── Base64url helpers ─────────────────────────────────────────────────────────

function b64urlToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64    = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
  const binary = atob(padded);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes as Uint8Array<ArrayBuffer>;
}

function bytesToB64url(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ── VAPID JWT (ES256) ─────────────────────────────────────────────────────────

async function signVapidJwt(
  audience:       string,
  subject:        string,
  privateKeyB64:  string,
  publicKeyB64:   string,
): Promise<string> {
  const header  = bytesToB64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: subject,
  })));

  const pubRaw = b64urlToBytes(publicKeyB64);
  const x = bytesToB64url(pubRaw.slice(1, 33));
  const y = bytesToB64url(pubRaw.slice(33, 65));

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: privateKeyB64, x, y, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const input = new TextEncoder().encode(`${header}.${payload}`);
  const sig   = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, input);
  return `${header}.${payload}.${bytesToB64url(new Uint8Array(sig))}`;
}

// ── RFC 8291 payload encryption ───────────────────────────────────────────────

async function encryptPayload(
  plaintext:   string,
  p256dhB64:   string,
  authB64:     string,
): Promise<Uint8Array> {
  const receiverPublicRaw = b64urlToBytes(p256dhB64);
  const authSecret        = b64urlToBytes(authB64);

  const receiverKey = await crypto.subtle.importKey(
    'raw', receiverPublicRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  );

  const senderPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  );
  const senderPublicRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', senderPair.publicKey),
  );

  const ecdhSecretBytes = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: receiverKey },
      senderPair.privateKey,
      256,
    ),
  );

  // IKM = HKDF(salt=auth_secret, IKM=ECDH_secret, info="WebPush: info\0||recv_pub||send_pub")
  const ecdhKey = await crypto.subtle.importKey('raw', ecdhSecretBytes, { name: 'HKDF' }, false, ['deriveBits']);
  const info1 = new Uint8Array([
    ...new TextEncoder().encode('WebPush: info\0'),
    ...receiverPublicRaw,
    ...senderPublicRaw,
  ]);
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: info1 },
      ecdhKey,
      256,
    ),
  );

  const salt   = crypto.getRandomValues(new Uint8Array(16));
  const ikmKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);

  const cekBytes = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt,
        info: new TextEncoder().encode('Content-Encoding: aes128gcm\0') },
      ikmKey, 128,
    ),
  );
  const nonceBytes = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt,
        info: new TextEncoder().encode('Content-Encoding: nonce\0') },
      ikmKey, 96,
    ),
  );

  const cek = await crypto.subtle.importKey('raw', cekBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const content  = new TextEncoder().encode(plaintext);
  const padded   = new Uint8Array(content.length + 1);
  padded.set(content);
  padded[content.length] = 0x02; // last-record delimiter

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBytes, tagLength: 128 }, cek, padded),
  );

  // Content-coding header: salt(16) + rs(4 big-endian) + keylen(1) + sender_pub(65)
  const rs     = 4096;
  const header = new Uint8Array(21 + senderPublicRaw.length);
  header.set(salt, 0);
  header[16] = (rs >>> 24) & 0xff;
  header[17] = (rs >>> 16) & 0xff;
  header[18] = (rs >>> 8)  & 0xff;
  header[19] =  rs         & 0xff;
  header[20] = senderPublicRaw.length;
  header.set(senderPublicRaw, 21);

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header);
  body.set(ciphertext, header.length);
  return body;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendPush(
  sub:            PushSubscription,
  payload:        PushPayload,
  vapidPrivKey:   string,
  vapidPubKey:    string,
  vapidSubject:   string,
): Promise<{ ok: boolean; status: number }> {
  const audience = new URL(sub.endpoint).origin;
  const jwt      = await signVapidJwt(audience, vapidSubject, vapidPrivKey, vapidPubKey);
  const body     = await encryptPayload(JSON.stringify(payload), sub.keys.p256dh, sub.keys.auth);

  const res = await fetch(sub.endpoint, {
    method:  'POST',
    headers: {
      'Authorization':    `vapid t=${jwt},k=${vapidPubKey}`,
      'Content-Type':     'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL':              '86400',
    },
    body: body.buffer as ArrayBuffer,
  });
  return { ok: res.ok || res.status === 201, status: res.status };
}
