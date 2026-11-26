import { requireAuth } from '@/middleware/auth';
import { handleRoute, parseSearchParams } from '@/middleware/route';
import { exportQuerySchema } from '@/lib/validation/schemas';
import { ensureProfile } from '@/modules/auth/service';
import { listMemories } from '@/modules/memories/service';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleRoute('/api/memories/export', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    parseSearchParams(request, exportQuerySchema);
    const memories = await listMemories(token);
    return new Response(JSON.stringify({ memories }, null, 2), {
      headers: { 'content-type': 'application/json', 'content-disposition': 'attachment; filename="memories.json"' },
    });
  });
}
