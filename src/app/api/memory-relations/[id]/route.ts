import { requireAuth } from '@/middleware/auth';
import { handleRoute, parseJson } from '@/middleware/route';
import { idParamSchema, updateRelationSchema } from '@/lib/validation/schemas';
import { ensureProfile } from '@/modules/auth/service';
import { repository } from '@/lib/spacetimedb/repository';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return handleRoute('/api/memory-relations/[id]', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const { id } = idParamSchema.parse(await context.params);
    const body = await parseJson(request, updateRelationSchema);
    await repository.updateRelationStatus(token, id, body.status);
    return Response.json({ ok: true });
  });
}
