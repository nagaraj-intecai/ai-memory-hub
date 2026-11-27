import { repository } from '@/lib/spacetimedb/repository';
import { notFound } from '@/middleware/errors';
import type { MemoryDto, MemoryRelationDto, MemorySourceDto, MemoryVersionDto } from '@/types/domain';

export async function listMemories(token: string): Promise<MemoryDto[]> {
  return repository.listMemories(token);
}

export async function requireMemory(token: string, memoryId: string): Promise<MemoryDto> {
  const memory = (await repository.listMemories(token)).find((row) => row.id === memoryId);
  if (!memory) throw notFound('Memory not found');
  return memory;
}

export async function getMemoryDetails(
  token: string,
  memoryId: string,
): Promise<{ memory: MemoryDto; sources: MemorySourceDto[]; versions: MemoryVersionDto[] }> {
  const memory = await requireMemory(token, memoryId);
  const [sources, versions] = await Promise.all([
    repository.getMemorySources(token, memoryId),
    repository.getMemoryVersions(token, memoryId),
  ]);
  return { memory, sources, versions };
}

export async function listRelations(token: string): Promise<MemoryRelationDto[]> {
  return repository.listRelations(token);
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

async function detectAndLinkRelations(token: string, created: MemoryDto, existing: MemoryDto[]): Promise<void> {
  const createdTokens = tokenize(`${created.title} ${created.summary} ${created.content}`);
  for (const other of existing) {
    if (other.id === created.id || other.status !== 'active') continue;
    const otherTokens = tokenize(`${other.title} ${other.summary} ${other.content}`);
    const similarity = jaccardSimilarity(createdTokens, otherTokens);
    const relationType =
      similarity >= 0.6 ? 'duplicates' : created.category === other.category && similarity >= 0.25 ? 'contradicts' : undefined;
    if (!relationType) continue;

    try {
      await repository.createRelation(token, {
        fromMemoryId: created.id,
        toMemoryId: other.id,
        relationType,
        strength: Number(Math.min(1, Math.max(0.1, similarity)).toFixed(2)),
      });
    } catch {
      // Ignore if relation already exists
    }
  }
}

export async function createMemory(
  token: string,
  input: Parameters<typeof repository.createMemory>[1],
  knownMemories?: MemoryDto[],
): Promise<MemoryDto> {
  const existing = knownMemories ?? (await repository.listMemories(token));
  const memory = await repository.createMemory(token, input);
  if (!memory) throw notFound('Memory could not be created');
  await detectAndLinkRelations(token, memory, existing);
  return memory;
}
