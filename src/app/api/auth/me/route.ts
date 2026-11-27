import { ensureProfile, getCurrentUser } from '@/modules/auth/service';
import { requireAuth } from '@/middleware/auth';
import { handleRoute } from '@/middleware/route';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleRoute('/api/auth/me', async () => {
    const { token, claims } = await requireAuth(request);
    const profile = await ensureProfile(token, claims);
    const current = await getCurrentUser(token, profile);
    return Response.json({ token, ...current });
  });
}
