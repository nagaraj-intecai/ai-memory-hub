import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { chatSchema, createMemorySchema, listMemoriesSchema, loginSchema, MEMORY_CATEGORIES, registerSchema } from '@/lib/validation/schemas';

describe('validation schemas', () => {
  it('rejects empty chat messages', () => {
    expect(chatSchema.safeParse({ message: '   ' }).success).toBe(false);
  });

  it('accepts a chat message with an optional conversation id', () => {
    expect(chatSchema.safeParse({ conversationId: '12', message: 'Remember this', model: 'openai/gpt-4o-mini' }).success).toBe(true);
  });

  it('rejects unsupported memory categories', () => {
    const result = createMemorySchema.safeParse({
      title: 'Title',
      content: 'Content',
      summary: 'Summary',
      category: 'unknown',
      importance: 10,
    });
    expect(result.success).toBe(false);
  });

  it('uses the required memory categories in both app and module', () => {
    const required = ['personal information', 'preferences', 'projects', 'tasks', 'knowledge'];
    const moduleSource = readFileSync(path.resolve(process.cwd(), 'spacetime/src/helpers.ts'), 'utf8');
    const moduleBlock = moduleSource.match(/MEMORY_CATEGORIES = \[([\s\S]*?)\]/)?.[1] ?? '';
    const moduleCategories = [...moduleBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]);

    expect([...MEMORY_CATEGORIES]).toEqual(required);
    expect(moduleCategories).toEqual(required);
  });

  it('applies list defaults', () => {
    const parsed = listMemoriesSchema.parse({});
    expect(parsed.limit).toBe(50);
    expect(parsed.offset).toBe(0);
  });

  it('validates register and login schemas', () => {
    expect(registerSchema.safeParse({ email: 'user@example.com', password: 'password123', displayName: 'User' }).success).toBe(true);
    expect(registerSchema.safeParse({ email: 'bad-email', password: 'short' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'password123' }).success).toBe(true);
  });

  it('hashes and verifies passwords', () => {
    const hash = hashPassword('super-secret-password');
    expect(verifyPassword('super-secret-password', hash)).toBe(true);
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });
});
