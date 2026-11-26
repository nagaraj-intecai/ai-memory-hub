import { getEnv } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET() {
  const env = getEnv();
  const issuer = env.OIDC_ISSUER.replace(/\/$/, '');
  return Response.json(
    {
      issuer: env.OIDC_ISSUER,
      jwks_uri: env.OIDC_JWKS_URL,
      response_types_supported: ['id_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'email', 'profile'],
      claims_supported: ['sub', 'iss', 'aud', 'email', 'name'],
      authorization_endpoint: `${issuer}/api/auth/login`,
      token_endpoint: `${issuer}/api/auth/login`,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
