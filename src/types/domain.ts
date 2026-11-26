export type AuthUserDto = {
  id: string;
  issuer: string;
  subject: string;
  displayName?: string;
  emailHash?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserSettingsDto = {
  userId: string;
  defaultModel: string;
  responseStyle: string;
  autoExtractMemories: boolean;
  timezone: string;
  maxPageSize: number;
  createdAt: string;
  updatedAt: string;
};

export type ConversationDto = {
  id: string;
  title: string;
  status: string;
  model: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageDto = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  status: string;
  finishReason?: string;
  promptTokens: number;
  completionTokens: number;
  createdAt: string;
};

export type MemoryDto = {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  importance: number;
  dedupeKey: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
};

export type MemorySourceDto = {
  id: string;
  memoryId: string;
  sourceType: string;
  sourceUri?: string;
  sourceHash?: string;
  excerpt?: string;
  conversationId?: string;
  messageId?: string;
  createdAt: string;
};

export type MemoryVersionDto = {
  id: string;
  memoryId: string;
  version: number;
  title: string;
  content: string;
  summary: string;
  category: string;
  changeReason: string;
  createdAt: string;
};

export type MemoryRelationDto = {
  id: string;
  fromMemoryId: string;
  toMemoryId: string;
  relationType: string;
  strength: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type AiUsageDto = {
  id: string;
  conversationId?: string;
  messageId?: string;
  model: string;
  operation: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  costUsd: string;
  status: string;
  errorCode?: string;
  latencyMs: number;
  generationId?: string;
  createdAt: string;
};

export type ActivityDto = {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadataJson: string;
  createdAt: string;
};
