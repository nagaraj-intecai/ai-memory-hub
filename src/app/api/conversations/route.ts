import { requireAuth } from '@/middleware/auth';
import { handleRoute, parseJson } from '@/middleware/route';
import { createConversationSchema } from '@/lib/validation/schemas';
import { createConversation, listConversations } from '@/modules/conversations/service';
import { ensureProfile } from '@/modules/auth/service';
import { resolveChatModel } from '@/modules/ai/service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleRoute('/api/conversations', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const body = await parseJson(request, createConversationSchema);
    const model = await resolveChatModel(token, body.model);
    const conversation = await createConversation(token, body.title, model);
    return Response.json(conversation, { status: 201 });
  });
}

export async function GET(request: Request) {
  return handleRoute('/api/conversations', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    return Response.json({ conversations: await listConversations(token) });
  });
}
