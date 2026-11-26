import { ensureProfile, getCurrentUser } from '@/modules/auth/service';
import { requireAuth } from '@/middleware/auth';
import { handleRoute } from '@/middleware/route';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleRoute('/api/auth/me', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const current = await getCurrentUser(token);
    return Response.json({ token, ...current });
  });
}
