import { createHash, randomUUID } from 'node:crypto';
import { signJwt } from '@/lib/auth/keys';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { getEnv } from '@/lib/env';
import type { AuthClaims } from '@/middleware/auth';
import { repository } from '@/lib/spacetimedb/repository';
import { ApiError, conflict, unauthorized } from '@/middleware/errors';
import type { AuthUserDto, UserSettingsDto } from '@/types/domain';

export async function emailHash(email: string | undefined): Promise<string | undefined> {
  if (!email) return undefined;
  return createHash('sha256').update(email.toLowerCase()).digest('hex');
}

export async function registerOrLogin(
  token: string,
  claims: AuthClaims,
): Promise<{ user: AuthUserDto; settings?: UserSettingsDto }> {
  const user = await repository.ensureUser(token, claims, await emailHash(claims.email));
  if (!user) throw new ApiError(500, 'profile_error', 'User profile could not be created');
  const settings = await repository.getSettings(token);
  return { user, settings };
}

export async function registerWithPassword(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ token: string; user: AuthUserDto; settings?: UserSettingsDto }> {
  const email = input.email.trim().toLowerCase();
  const serviceToken = await signJwt({ subject: 'auth-service', expiresIn: '2m' });
  const existing = await repository.findAuthAccountByEmail(serviceToken, email);
  if (existing) throw conflict('Email is already registered');

  const subject = randomUUID();
  const passwordHash = hashPassword(input.password);
  await repository.createAuthAccount(serviceToken, {
    email,
    passwordHash,
    subject,
    displayName: input.displayName,
  });

  const env = getEnv();
  const token = await signJwt({ subject, email, displayName: input.displayName });
  const { user, settings } = await registerOrLogin(token, {
    issuer: env.OIDC_ISSUER,
    subject,
    audience: [env.OIDC_AUDIENCE],
    email,
    displayName: input.displayName,
  });
  return { token, user, settings };
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUserDto; settings?: UserSettingsDto }> {
  const email = input.email.trim().toLowerCase();
  const serviceToken = await signJwt({ subject: 'auth-service', expiresIn: '2m' });
  const account = await repository.findAuthAccountByEmail(serviceToken, email);
  if (!account || !verifyPassword(input.password, account.passwordHash)) {
    throw unauthorized('Invalid email or password');
  }

  const env = getEnv();
  const token = await signJwt({
    subject: account.subject,
    email: account.email,
    displayName: account.displayName,
  });
  const { user, settings } = await registerOrLogin(token, {
    issuer: env.OIDC_ISSUER,
    subject: account.subject,
    audience: [env.OIDC_AUDIENCE],
    email: account.email,
    displayName: account.displayName,
  });
  return { token, user, settings };
}

export async function ensureProfile(token: string, claims: AuthClaims): Promise<void> {
  await repository.ensureUser(token, claims, await emailHash(claims.email));
}

export async function getCurrentUser(token: string): Promise<{ user?: AuthUserDto; settings?: UserSettingsDto }> {
  const user = await repository.getProfile(token);
  const settings = await repository.getSettings(token);
  return { user, settings };
}
