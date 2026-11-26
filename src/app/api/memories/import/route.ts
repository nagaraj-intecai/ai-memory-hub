import { createHash } from 'node:crypto';
import { requireAuth } from '@/middleware/auth';
import { handleRoute, parseJson } from '@/middleware/route';
import { importSchema } from '@/lib/validation/schemas';
import { ensureProfile } from '@/modules/auth/service';
import { createMemory } from '@/modules/memories/service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleRoute('/api/memories/import', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const body = await parseJson(request, importSchema);
    const created = [];
    for (const item of body.memories) {
      const dedupeKey = item.dedupeKey ?? createHash('sha256').update(`${item.title}\n${item.summary}`).digest('hex');
      created.push(await createMemory(token, { ...item, dedupeKey }));
    }
    return Response.json({ created: created.length, memories: created }, { status: 201 });
  });
}
