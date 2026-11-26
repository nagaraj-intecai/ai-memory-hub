import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import { getLocalPublicKey, LOCAL_KEY_ID } from '@/lib/auth/keys';
import { getEnv } from '@/lib/env';
import { logger, sessionCookieName } from '@/lib/logger';
import { unauthorized } from '@/middleware/errors';

export type AuthClaims = {
  issuer: string;
  subject: string;
  audience: string[];
  email?: string;
  displayName?: string;
};

export type AuthContext = {
  token: string;
  claims: AuthClaims;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(getEnv().OIDC_JWKS_URL));
  return jwks;
}

function parseCookies(header: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key || !value) continue;
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      continue;
    }
  }
  return result;
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function extractToken(request: Request): string | undefined {
  const authorization = request.headers.get('authorization');
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim();
  }
  return parseCookies(request.headers.get('cookie'))[sessionCookieName()];
}

export async function verifyToken(token: string): Promise<AuthClaims> {
  const env = getEnv();
  try {
    const header = decodeProtectedHeader(token);
    const keyOrJwks = header.kid === LOCAL_KEY_ID ? await getLocalPublicKey() : getJwks();
    const { payload } = await jwtVerify(token, keyOrJwks as Parameters<typeof jwtVerify>[1], {
      issuer: env.OIDC_ISSUER,
      audience: env.OIDC_AUDIENCE,
    });
    if (!payload.sub || !payload.iss) throw new Error('Missing subject or issuer');
    const audience = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
    return {
      issuer: payload.iss,
      subject: payload.sub,
      audience,
      email: readString(payload as Record<string, unknown>, 'email'),
      displayName: readString(payload as Record<string, unknown>, 'name'),
    };
  } catch (error) {
    logger.warn('auth.token.rejected', { reason: error instanceof Error ? error.name : 'unknown' });
    throw unauthorized();
  }
}

export async function requireAuth(request: Request): Promise<AuthContext> {
  const token = extractToken(request);
  if (!token) throw unauthorized();
  return { token, claims: await verifyToken(token) };
}

function sessionCookie(value: string, maxAgeSeconds: number): string {
  const secure = getEnv().OIDC_ISSUER.startsWith('https://');
  return [
    `${sessionCookieName()}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function withSessionCookie(response: Response, token: string, maxAgeSeconds = 86_400): Response {
  response.headers.append('Set-Cookie', sessionCookie(encodeURIComponent(token), maxAgeSeconds));
  return response;
}

export function clearSessionCookie(response: Response): Response {
  response.headers.append('Set-Cookie', sessionCookie('', 0));
  return response;
}
