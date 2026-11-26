import { createHash } from 'node:crypto';
import { requireAuth } from '@/middleware/auth';
import { handleRoute, parseJson, parseSearchParams } from '@/middleware/route';
import { createMemorySchema, listMemoriesSchema } from '@/lib/validation/schemas';
import { ensureProfile } from '@/modules/auth/service';
import { createMemory, listMemories } from '@/modules/memories/service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleRoute('/api/memories', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const body = await parseJson(request, createMemorySchema);
    const dedupeKey =
      body.dedupeKey ?? createHash('sha256').update(`${body.title}\n${body.summary ?? ''}`).digest('hex');
    const memory = await createMemory(token, {
      ...body,
      dedupeKey,
    });
    return Response.json(memory, { status: 201 });
  });
}

export async function GET(request: Request) {
  return handleRoute('/api/memories', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const query = parseSearchParams(request, listMemoriesSchema);
    const memories = (await listMemories(token))
      .filter((memory) => (query.category ? memory.category === query.category : true))
      .filter((memory) => (query.status ? memory.status === query.status : true))
      .filter((memory) => (query.q ? `${memory.title} ${memory.summary} ${memory.content}`.toLowerCase().includes(query.q.toLowerCase()) : true))
      .slice(query.offset, query.offset + query.limit);
    return Response.json({ memories });
  });
}
