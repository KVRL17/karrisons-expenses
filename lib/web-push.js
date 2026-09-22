import crypto from 'crypto';

function b64urlToBuffer(value) {
  return Buffer.from(String(value || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function bufferToB64url(value) {
  return Buffer.from(value).toString('base64url');
}

function hkdfExpand(prk, info, length) {
  let output = Buffer.alloc(0);
  let previous = Buffer.alloc(0);
  let counter = 1;
  while (output.length < length) {
    previous = crypto.createHmac('sha256', prk)
      .update(Buffer.concat([previous, Buffer.from(info), Buffer.from([counter])]))
      .digest();
    output = Buffer.concat([output, previous]);
    counter += 1;
  }
  return output.subarray(0, length);
}

function makeVapidJwt(endpoint, publicKey, privateKey) {
  const publicBytes = b64urlToBuffer(publicKey);
  const privateBytes = b64urlToBuffer(privateKey);
  if (publicBytes.length !== 65 || publicBytes[0] !== 4 || privateBytes.length !== 32) {
    throw new Error('Invalid VAPID key format. Run npm run vapid and copy the generated keys into Vercel environment variables.');
  }

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: bufferToB64url(publicBytes.subarray(1, 33)),
    y: bufferToB64url(publicBytes.subarray(33, 65)),
    d: bufferToB64url(privateBytes)
  };
  const key = crypto.createPrivateKey({ key: jwk, format: 'jwk' });
  const header = bufferToB64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = bufferToB64url(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60),
    sub: process.env.VAPID_SUBJECT || 'https://karri-sons-expenses.vercel.app/'
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' });
  return `${unsigned}.${bufferToB64url(signature)}`;
}

function encryptPayload(subscription, payload) {
  const userPublic = b64urlToBuffer(subscription.keys?.p256dh);
  const authSecret = b64urlToBuffer(subscription.keys?.auth);
  if (userPublic.length !== 65 || userPublic[0] !== 4 || authSecret.length < 16) {
    throw new Error('Invalid browser push subscription.');
  }

  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const serverPublic = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(userPublic);

  const authPrk = crypto.createHmac('sha256', authSecret).update(sharedSecret).digest();
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), userPublic, serverPublic]);
  const ikm = hkdfExpand(authPrk, keyInfo, 32);

  const salt = crypto.randomBytes(16);
  const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
  const cek = hkdfExpand(prk, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdfExpand(prk, Buffer.from('Content-Encoding: nonce\0'), 12);

  const plaintext = Buffer.concat([Buffer.from(payload), Buffer.from([2])]);
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  return Buffer.concat([salt, recordSize, Buffer.from([serverPublic.length]), serverPublic, ciphertext]);
}

export function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function sendWebPush(subscription, message) {
  if (!pushConfigured()) return { ok: false, skipped: true, reason: 'VAPID keys are not configured.' };

  const payload = JSON.stringify(message);
  const body = encryptPayload(subscription, payload);
  const token = makeVapidJwt(subscription.endpoint, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${token}, k=${process.env.VAPID_PUBLIC_KEY}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal'
    },
    body
  });

  if (response.ok || response.status === 201) return { ok: true, status: response.status };
  const errorText = await response.text().catch(() => '');
  const error = new Error(`Push service returned ${response.status}${errorText ? `: ${errorText.slice(0, 160)}` : ''}`);
  error.status = response.status;
  throw error;
}
