import { repository, type SaveMessageInput } from '@/lib/spacetimedb/repository';

export async function saveMessage(token: string, input: SaveMessageInput): Promise<void> {
  await repository.saveMessage(token, input);
}
