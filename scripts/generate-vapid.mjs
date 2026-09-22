import crypto from 'crypto';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publicJwk = publicKey.export({ format: 'jwk' });
const privateJwk = privateKey.export({ format: 'jwk' });
const decode = (value) => Buffer.from(value, 'base64url');
const publicBytes = Buffer.concat([Buffer.from([4]), decode(publicJwk.x), decode(publicJwk.y)]);

console.log('\nCopy these into Vercel → Project → Settings → Environment Variables:\n');
console.log(`VAPID_PUBLIC_KEY=${publicBytes.toString('base64url')}`);
console.log(`VAPID_PRIVATE_KEY=${decode(privateJwk.d).toString('base64url')}`);
console.log('VAPID_SUBJECT=https://karri-sons-expenses.vercel.app/\n');
