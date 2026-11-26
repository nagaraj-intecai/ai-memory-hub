import { requireAuth } from '@/middleware/auth';
import { handleRoute } from '@/middleware/route';
import { ensureProfile } from '@/modules/auth/service';
import { repository } from '@/lib/spacetimedb/repository';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleRoute('/api/activity', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const activity = (await repository.listActivity(token)).slice(0, 50);
    return Response.json({ activity });
  });
}
