import { clearSessionCookie } from '@/middleware/auth';
import { handleRoute } from '@/middleware/route';

export const runtime = 'nodejs';

export async function POST() {
  return handleRoute('/api/auth/logout', async () => clearSessionCookie(Response.json({ ok: true })));
}
