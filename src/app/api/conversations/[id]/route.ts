import { requireAuth } from '@/middleware/auth';
import { handleRoute, parseId } from '@/middleware/route';
import { idParamSchema } from '@/lib/validation/schemas';
import { deleteConversation, getConversationMessages } from '@/modules/conversations/service';
import { ensureProfile } from '@/modules/auth/service';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return handleRoute('/api/conversations/[id]', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const { id: rawId } = idParamSchema.parse(await context.params);
    const id = parseId(rawId).toString();
    return Response.json({ conversationId: id, messages: await getConversationMessages(token, id) });
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleRoute('/api/conversations/[id]', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const { id: rawId } = idParamSchema.parse(await context.params);
    const id = parseId(rawId).toString();
    await deleteConversation(token, id);
    return Response.json({ ok: true });
  });
}
