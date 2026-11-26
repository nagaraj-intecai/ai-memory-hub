import { loginWithPassword } from '@/modules/auth/service';
import { withSessionCookie } from '@/middleware/auth';
import { handleRoute, parseJson } from '@/middleware/route';
import { loginSchema } from '@/lib/validation/schemas';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleRoute('/api/auth/login', async () => {
    const body = await parseJson(request, loginSchema);
    const result = await loginWithPassword(body);
    return withSessionCookie(Response.json(result), result.token);
  });
}
