import { repository } from '@/lib/spacetimedb/repository';
import type { MemoryDto } from '@/types/domain';

function tokenize(value: string): string[] {
  const base = value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
  if (base.includes('dob')) base.push('date', 'birth', 'birthday');
  return base;
}

export async function retrieveRelevantMemories(token: string, query: string, limit = 12): Promise<MemoryDto[]> {
  const memories = (await repository.listMemories(token)).filter((memory) => memory.status === 'active');
  const queryTokens = new Set(tokenize(query));
  const scored = memories
    .map((memory) => {
      const contentTokens = tokenize(`${memory.title} ${memory.summary} ${memory.content}`);
      const score = contentTokens.reduce((total, current) => total + (queryTokens.has(current) ? 1 : 0), 0);
      return { memory, score };
    })
    .sort((a, b) => b.score - a.score || b.memory.importance - a.memory.importance);
  return scored.slice(0, limit).map((entry) => entry.memory);
}
