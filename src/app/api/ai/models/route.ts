import { requireAuth } from '@/middleware/auth';
import { handleRoute, parseSearchParams } from '@/middleware/route';
import { modelsQuerySchema } from '@/lib/validation/schemas';
import { ensureProfile } from '@/modules/auth/service';
import { fetchModels } from '@/lib/openrouter/client';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleRoute('/api/ai/models', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const query = parseSearchParams(request, modelsQuerySchema);
    const models = await fetchModels(query.refresh === 'true');
    return Response.json({ models });
  });
}
