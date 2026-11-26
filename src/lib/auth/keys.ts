import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exportJWK, generateKeyPair, importJWK, SignJWT, type JWK } from 'jose';
import { getEnv } from '@/lib/env';

const ALG = 'RS256';
export const LOCAL_KEY_ID = 'k1';
const KEY_FILE = join(process.cwd(), '.auth-key.json');

type ImportedKey = Awaited<ReturnType<typeof importJWK>>;

type StoredKeyPair = {
  privateJwk: JWK;
  publicJwk: JWK;
};

let keyPromise: Promise<{ privateKey: ImportedKey; publicKey: ImportedKey; publicJwk: JWK }> | undefined;

async function loadOrCreateKeys(): Promise<{ privateKey: ImportedKey; publicKey: ImportedKey; publicJwk: JWK }> {
  let stored: StoredKeyPair | undefined;

  if (existsSync(KEY_FILE)) {
    const candidate = JSON.parse(readFileSync(KEY_FILE, 'utf8')) as StoredKeyPair;
    if (candidate?.publicJwk?.alg === ALG && candidate?.publicJwk?.kid === LOCAL_KEY_ID) {
      stored = candidate;
    }
  }

  if (!stored) {
    const { privateKey, publicKey } = await generateKeyPair(ALG, { extractable: true });
    const privateJwk = await exportJWK(privateKey);
    const publicJwk = await exportJWK(publicKey);
    privateJwk.kid = LOCAL_KEY_ID;
    privateJwk.alg = ALG;
    privateJwk.use = 'sig';
    publicJwk.kid = LOCAL_KEY_ID;
    publicJwk.alg = ALG;
    publicJwk.use = 'sig';
    stored = { privateJwk, publicJwk };
    try {
      writeFileSync(KEY_FILE, JSON.stringify(stored, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = JSON.parse(readFileSync(KEY_FILE, 'utf8')) as StoredKeyPair;
      if (existing?.publicJwk?.alg !== ALG || existing?.publicJwk?.kid !== LOCAL_KEY_ID) {
        throw new Error('Invalid local signing key');
      }
      stored = existing;
    }
  }

  const privateKey = await importJWK(stored.privateJwk, ALG);
  const publicKey = await importJWK(stored.publicJwk, ALG);
  return { privateKey, publicKey, publicJwk: stored.publicJwk };
}

function getKeys() {
  if (!keyPromise) {
    keyPromise = loadOrCreateKeys();
  }
  return keyPromise;
}

export async function getPublicJwks(): Promise<{ keys: JWK[] }> {
  const { publicJwk } = await getKeys();
  return { keys: [publicJwk] };
}

export async function getLocalPublicKey(): Promise<ImportedKey> {
  const { publicKey } = await getKeys();
  return publicKey;
}

export async function signJwt(claims: {
  subject: string;
  email?: string;
  displayName?: string;
  expiresIn?: string;
}): Promise<string> {
  const env = getEnv();
  const { privateKey } = await getKeys();
  const payload: Record<string, string> = {};
  if (claims.email) payload.email = claims.email;
  if (claims.displayName) payload.name = claims.displayName;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG, kid: LOCAL_KEY_ID, typ: 'JWT' })
    .setIssuer(env.OIDC_ISSUER)
    .setAudience(env.OIDC_AUDIENCE)
    .setSubject(claims.subject)
    .setIssuedAt()
    .setExpirationTime(claims.expiresIn ?? '24h')
    .sign(privateKey);
}
