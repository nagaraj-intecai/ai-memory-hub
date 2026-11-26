import { requireAuth } from '@/middleware/auth';
import { handleRoute } from '@/middleware/route';
import { idParamSchema } from '@/lib/validation/schemas';
import { ensureProfile } from '@/modules/auth/service';
import { requireMemory } from '@/modules/memories/service';
import { repository } from '@/lib/spacetimedb/repository';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  return handleRoute('/api/memories/[id]/archive', async () => {
    const { id } = idParamSchema.parse(await context.params);
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    await requireMemory(token, id);
    await repository.archiveMemory(token, id);
    return Response.json({ ok: true });
  });
}
