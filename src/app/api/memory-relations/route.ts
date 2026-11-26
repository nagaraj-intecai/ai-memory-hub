import { requireAuth } from '@/middleware/auth';
import { handleRoute, parseJson } from '@/middleware/route';
import { createRelationSchema } from '@/lib/validation/schemas';
import { ensureProfile } from '@/modules/auth/service';
import { listRelations } from '@/modules/memories/service';
import { repository } from '@/lib/spacetimedb/repository';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleRoute('/api/memory-relations', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    return Response.json({ relations: await listRelations(token) });
  });
}

export async function POST(request: Request) {
  return handleRoute('/api/memory-relations', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const body = await parseJson(request, createRelationSchema);
    await repository.createRelation(token, body);
    return Response.json({ ok: true }, { status: 201 });
  });
}
