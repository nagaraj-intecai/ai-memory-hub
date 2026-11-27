import { repository } from '@/lib/spacetimedb/repository';
import { notFound } from '@/middleware/errors';
import type { ConversationDto, MessageDto } from '@/types/domain';

export async function listConversations(token: string): Promise<ConversationDto[]> {
  return repository.listConversations(token);
}

export async function requireConversation(token: string, conversationId: string): Promise<ConversationDto> {
  const conversation = (await repository.listConversations(token)).find((row) => row.id === conversationId);
  if (!conversation) throw notFound('Conversation not found');
  return conversation;
}

export async function createConversation(token: string, title: string, model: string): Promise<ConversationDto> {
  const conversation = await repository.createConversation(token, title, model);
  if (!conversation) throw notFound('Conversation could not be created');
  return conversation;
}

export async function getConversationMessages(token: string, conversationId: string): Promise<MessageDto[]> {
  const [, messages] = await Promise.all([
    requireConversation(token, conversationId),
    repository.getMessages(token, conversationId),
  ]);
  return messages;
}

export async function deleteConversation(token: string, conversationId: string): Promise<void> {
  await requireConversation(token, conversationId);
  await repository.deleteConversation(token, conversationId);
}
