import { requireAuth } from '@/middleware/auth';
import { handleRoute, parseJson } from '@/middleware/route';
import { settingsSchema } from '@/lib/validation/schemas';
import { ensureProfile } from '@/modules/auth/service';
import { repository } from '@/lib/spacetimedb/repository';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return handleRoute('/api/settings', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    return Response.json({ settings: await repository.getSettings(token) });
  });
}

export async function PATCH(request: Request) {
  return handleRoute('/api/settings', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const body = await parseJson(request, settingsSchema);
    await repository.updateSettings(token, body);
    return Response.json({ settings: await repository.getSettings(token) });
  });
}
