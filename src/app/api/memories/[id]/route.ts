import { requireAuth } from '@/middleware/auth';
import { handleRoute, parseJson } from '@/middleware/route';
import { idParamSchema, updateMemorySchema } from '@/lib/validation/schemas';
import { ensureProfile } from '@/modules/auth/service';
import { getMemoryDetails } from '@/modules/memories/service';
import { repository } from '@/lib/spacetimedb/repository';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleRoute('/api/memories/[id]', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const { id } = idParamSchema.parse(await context.params);
    return Response.json(await getMemoryDetails(token, id));
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleRoute('/api/memories/[id]', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const { id } = idParamSchema.parse(await context.params);
    const body = await parseJson(request, updateMemorySchema);
    await repository.updateMemory(token, id, body);
    return Response.json(await getMemoryDetails(token, id));
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleRoute('/api/memories/[id]', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const { id } = idParamSchema.parse(await context.params);
    await repository.deleteMemory(token, id);
    return Response.json({ ok: true });
  });
}
