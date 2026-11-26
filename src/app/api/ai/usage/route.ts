import { requireAuth } from '@/middleware/auth';
import { handleRoute, parseSearchParams } from '@/middleware/route';
import { usageQuerySchema } from '@/lib/validation/schemas';
import { ensureProfile } from '@/modules/auth/service';
import { repository } from '@/lib/spacetimedb/repository';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleRoute('/api/ai/usage', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const query = parseSearchParams(request, usageQuerySchema);
    const usage = (await repository.listUsage(token))
      .filter((entry) => (query.conversationId ? entry.conversationId === query.conversationId : true))
      .slice(0, query.limit);
    return Response.json({ usage });
  });
}
