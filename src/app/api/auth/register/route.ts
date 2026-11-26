import { registerWithPassword } from '@/modules/auth/service';
import { withSessionCookie } from '@/middleware/auth';
import { handleRoute, parseJson } from '@/middleware/route';
import { registerSchema } from '@/lib/validation/schemas';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleRoute('/api/auth/register', async () => {
    const body = await parseJson(request, registerSchema);
    const result = await registerWithPassword(body);
    return withSessionCookie(Response.json(result, { status: 201 }), result.token);
  });
}
