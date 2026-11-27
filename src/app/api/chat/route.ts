import { requireAuth } from '@/middleware/auth';
import { handleRoute, parseId, parseJson } from '@/middleware/route';
import { chatSchema } from '@/lib/validation/schemas';
import { ensureProfile } from '@/modules/auth/service';
import { requireConversation } from '@/modules/conversations/service';
import { resolveChatModel, streamChat } from '@/modules/ai/service';
import { repository } from '@/lib/spacetimedb/repository';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleRoute('/api/chat', async () => {
    const { token, claims } = await requireAuth(request);
    await ensureProfile(token, claims);
    const body = await parseJson(request, chatSchema);
    const settings = await repository.getSettings(token);
    const model = await resolveChatModel(token, body.model, settings);

    let conversationId: string;
    if (body.conversationId) {
      conversationId = parseId(body.conversationId).toString();
      await requireConversation(token, conversationId);
    } else {
      const { createConversation } = await import('@/modules/conversations/service');
      const conversation = await createConversation(token, body.message.slice(0, 60), model);
      conversationId = conversation.id;
    }

    const response = await streamChat({ token, conversationId, userMessage: body.message, model, settings });
    response.headers.set('x-conversation-id', conversationId);
    return response;
  });
}
