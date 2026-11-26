import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().regex(/^\d+$/) });

export const authSchema = z.object({}).strict();

export const registerSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
  displayName: z.string().trim().min(1).max(200).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(200),
});

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(200),
  model: z.string().trim().min(1).max(200).optional(),
});

export const chatSchema = z.object({
  conversationId: z.string().regex(/^\d+$/).optional(),
  message: z.string().trim().min(1).max(100_000),
  model: z.string().trim().min(1).max(200).optional(),
});

export const MEMORY_CATEGORIES = [
  'personal information',
  'preferences',
  'projects',
  'tasks',
  'knowledge',
] as const;

export const createMemorySchema = z.object({
  title: z.string().trim().min(1).max(300),
  content: z.string().trim().min(1).max(50_000),
  summary: z.string().trim().min(1).max(2_000),
  category: z.enum(MEMORY_CATEGORIES),
  importance: z.number().int().min(0).max(100),
  dedupeKey: z.string().trim().min(1).max(512).optional(),
  sourceType: z.string().trim().min(1).max(100).optional(),
  sourceUri: z.string().trim().min(1).max(2_000).optional(),
  sourceHash: z.string().trim().min(1).max(200).optional(),
  excerpt: z.string().trim().min(1).max(4_000).optional(),
  conversationId: z.string().regex(/^\d+$/).optional(),
  messageId: z.string().regex(/^\d+$/).optional(),
});

export const updateMemorySchema = z.object({
  title: z.string().trim().min(1).max(300),
  content: z.string().trim().min(1).max(50_000),
  summary: z.string().trim().min(1).max(2_000),
  category: z.enum(MEMORY_CATEGORIES),
  importance: z.number().int().min(0).max(100),
  changeReason: z.string().trim().min(1).max(200).optional(),
});

export const listMemoriesSchema = z.object({
  category: z.enum(MEMORY_CATEGORIES).optional(),
  status: z.enum(['active', 'archived']).optional(),
  q: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createRelationSchema = z.object({
  fromMemoryId: z.string().regex(/^\d+$/),
  toMemoryId: z.string().regex(/^\d+$/),
  relationType: z.enum(['related', 'supports', 'contradicts', 'causes', 'duplicates']),
  strength: z.number().min(0).max(1),
});

export const updateRelationSchema = z.object({
  status: z.enum(['active', 'superseded', 'rejected']),
});

export const modelsQuerySchema = z.object({
  refresh: z.enum(['true', 'false']).default('false'),
});

export const usageQuerySchema = z.object({
  conversationId: z.string().regex(/^\d+$/).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const importSchema = z.object({
  memories: z.array(createMemorySchema).min(1).max(500),
});

export const exportQuerySchema = z.object({
  format: z.enum(['json']).default('json'),
});

export const settingsSchema = z.object({
  defaultModel: z.string().trim().max(200),
  responseStyle: z.string().trim().min(1).max(100),
  autoExtractMemories: z.boolean(),
  timezone: z.string().trim().min(1).max(100),
  maxPageSize: z.number().int().min(1).max(200),
});
