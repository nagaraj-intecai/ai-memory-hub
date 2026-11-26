import { getPublicJwks } from '@/lib/auth/keys';

export const runtime = 'nodejs';

export async function GET() {
  const jwks = await getPublicJwks();
  return Response.json(jwks, {
    headers: { 'cache-control': 'no-store' },
  });
}
