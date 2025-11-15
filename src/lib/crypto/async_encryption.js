/**
 * TODO CODE REVIEW
 * Сгенерировано! нужны проверки.
 * ВЕРСИЯ С ОПТИМИЗИРОВАННЫМ (КОРОТКИМ) ENVELOPE
 */

import sodium from 'libsodium-wrappers-sumo';

const CONTEXT_WRAP = 'e2e-sodium-wrap-v1';
const LS_IDENTITY = 'e2e_sodium_identity_v1';

function bufToBase64Url(b) {
  const bin = typeof b === 'string' ? b : String.fromCharCode.apply(null, new Uint8Array(b));
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuf(s) {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function now() { return Date.now(); }

async function ready() {
  if (!sodium.ready) await sodium.ready;
  return sodium;
}

async function createIdentity(chatId) {
  await ready();
  const kp = sodium.crypto_sign_keypair();
  const curve_sk = sodium.crypto_sign_ed25519_sk_to_curve25519(kp.privateKey);
  const curve_pk = sodium.crypto_sign_ed25519_pk_to_curve25519(kp.publicKey);
  const store = {
    ed25519_pk: bufToBase64Url(kp.publicKey),
    ed25519_sk: bufToBase64Url(kp.privateKey),
    curve25519_pk: bufToBase64Url(curve_pk),
    curve25519_sk: bufToBase64Url(curve_sk),
  };
  return {
    ed25519_pk: kp.publicKey,
    ed25519_sk: kp.privateKey,
    curve25519_pk: curve_pk,
    curve25519_sk: curve_sk,
  };
}

function publicIdentityPack(identity, userId) {
  return {
    i: userId, // id -> i
    e: identity.edp, // ed25519_pk -> e
    c: identity.cvp, // curve25519_pk -> c
    t: now(), // ts -> t
  };
}

function deriveKek(shared, context) {
  const contextBytes = sodium.from_string(context);
  return sodium.crypto_generichash(32, shared, contextBytes);
}
function randomNonce(len = 12) {
  return sodium.randombytes_buf(len);
}
function encryptWithContentKey(contentKey, plaintext, aad = null) {
  const nonce = randomNonce(12);
  const cipher = sodium.crypto_aead_chacha20poly1305_ietf_encrypt(plaintext, aad || null, null, nonce, contentKey);
  return { nonce, cipher };
}
function decryptWithContentKey(contentKey, cipher, nonce, aad = null) {
  return sodium.crypto_aead_chacha20poly1305_ietf_decrypt(null, cipher, aad || null, nonce, contentKey);
}
function wrapContentKey(kek, contentKey) {
  const nonce = randomNonce(12);
  const wrapped = sodium.crypto_aead_chacha20poly1305_ietf_encrypt(contentKey, null, null, nonce, kek);
  return { wrapped, nonce };
}
function unwrapContentKey(kek, wrapped, nonce) {
  return sodium.crypto_aead_chacha20poly1305_ietf_decrypt(null, wrapped, null, nonce, kek);
}
function signEnvelope(sk, bytes) {
  return sodium.crypto_sign_detached(bytes, sk);
}
function verifySignature(pk, bytes, sig) {
  return sodium.crypto_sign_verify_detached(sig, bytes, pk);
}

function canonicalizeForSign(obj) {
  const parts = [];
  parts.push(obj.s || ''); // senderId -> s
  parts.push(obj.e || ''); // ephemeral_pub -> e
  parts.push(obj.n || ''); // content_nonce -> n
  parts.push(obj.c || ''); // ciphertext -> c
  // wrappers: sort by id to make deterministic
  const wrappers = (obj.w || []).slice().sort((a, b) => a.i.localeCompare(b.i)); // wrappers -> w, id -> i
  for (const w of wrappers) {
    parts.push(w.i); // id -> i
    parts.push(w.o || ''); // nonce -> o
    parts.push(w.p || ''); // wrapped -> p
  }
  parts.push(obj.t || ''); // ts -> t
  return sodium.from_string(parts.join('|'));
}

async function getEncrypted(senderId, identity, recipients, plaintext) {
  await ready();
  let i = 0;
  if (typeof plaintext === 'string') plaintext = sodium.from_string(plaintext);

  const eph = sodium.crypto_box_keypair();
  const contentKey = sodium.randombytes_buf(sodium.crypto_aead_chacha20poly1305_ietf_KEYBYTES);
  const timestamp = now();

  // AAD теперь формируется, но не отправляется. Он будет восстановлен на принимающей стороне.
  const aad = sodium.from_string(`1|${senderId}|${timestamp}`);
  const { nonce: content_nonce, cipher: ciphertext } = encryptWithContentKey(contentKey, plaintext, aad);
  
  const wrappers = [];
  for (const r of recipients) {
    const r_curve = base64UrlToBuf(r.c); // Используем короткий ключ 'c'
    const shared = sodium.crypto_scalarmult(eph.privateKey, r_curve);

    const kek = deriveKek(shared, CONTEXT_WRAP);

    const { wrapped, nonce: wrap_nonce } = wrapContentKey(kek, contentKey);
    wrappers.push({
      i: r.i, // id -> i
      p: bufToBase64Url(wrapped), // wrapped -> p (payload)
      o: bufToBase64Url(wrap_nonce), // nonce -> o
    });
  }

  const envelope = {
    s: senderId,                           // senderId -> s
    e: bufToBase64Url(eph.publicKey),      // ephemeral_pub -> e
    n: bufToBase64Url(content_nonce),      // content_nonce -> n
    c: bufToBase64Url(ciphertext),         // ciphertext -> c
    w: wrappers,                           // wrappers -> w
    t: timestamp,                          // ts -> t (Unix timestamp)
  };

  const bytesForSign = canonicalizeForSign(envelope);
  const sig = signEnvelope(base64UrlToBuf(identity.eds), bytesForSign);
  envelope.g = bufToBase64Url(sig);        // signature -> g
  envelope.k = identity.edp; // sender_ed25519_pk -> k

  return envToStr(envelope);
}

/* sussy */
const envToStr = e => {
    const k = Object.values(e)
    const w = k[4].map(x => Object.values(x).join(',')).join(';')
    return `${k.slice(0, 4).join('|')}|${w}|${k.slice(5, 8).join('|')}`
}

const strToEnv = array => {
    const i = array.split('|')
    return {
        s: i[0],
        e: i[1],
        n: i[2],
        c: i[3],
        w: i[4].split(';').map(x => {const [i,p,o]=x.split(',');return {i:+i,p,o}}),
        t: i[5],
        g: i[6],
        k: i[7],
    }
}

async function handleIncomingEnvelope(_envelope, myId, myIdentity) {
  await ready();
  try {
    const envelope = strToEnv(_envelope)
    console.log(envelope)
    const sender_pk = base64UrlToBuf(envelope.k); // sender_ed25519_pk -> k
    const bytesForSign = canonicalizeForSign(envelope);
    const sig = base64UrlToBuf(envelope.g); // signature -> g
    if (!verifySignature(sender_pk, bytesForSign, sig)) {
      throw new Error('invalid signature');
    }

    const wrapper = (envelope.w || []).find(w => w.i === myId); // wrappers -> w, id -> i
    if (!wrapper) throw new Error('no wrapper for me');

    const eph_pub = base64UrlToBuf(envelope.e); // ephemeral_pub -> e
    const shared = sodium.crypto_scalarmult(myIdentity.cvs, eph_pub);
    const kek = deriveKek(shared, CONTEXT_WRAP);

    const wrapped = base64UrlToBuf(wrapper.p); // wrapped -> p
    const wrap_nonce = base64UrlToBuf(wrapper.o); // nonce -> o
    const rawContentKey = unwrapContentKey(kek, wrapped, wrap_nonce);

    // Восстанавливаем AAD из данных конверта
    const aad = sodium.from_string(`1|${envelope.s}|${envelope.t}`);
    
    const content_nonce = base64UrlToBuf(envelope.n); // content_nonce -> n
    const ciphertext = base64UrlToBuf(envelope.c); // ciphertext -> c
    const plaintext = decryptWithContentKey(rawContentKey, ciphertext, content_nonce, aad);

    return { ok: true, plaintext: sodium.to_string(plaintext), meta: { senderId: envelope.s, ts: envelope.t } };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export {
  ready,
  createIdentity,
  publicIdentityPack,
  getEncrypted,
  handleIncomingEnvelope,
  bufToBase64Url,
};
