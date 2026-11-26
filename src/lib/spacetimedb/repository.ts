import type { AuthClaims } from '@/middleware/auth';
import type {
  ActivityDto,
  AiUsageDto,
  AuthUserDto,
  ConversationDto,
  MemoryDto,
  MemoryRelationDto,
  MemorySourceDto,
  MemoryVersionDto,
  MessageDto,
  UserSettingsDto,
} from '@/types/domain';
import { bigintString, callReducer, numberValue, queryRows, textValue } from '@/lib/spacetimedb/http';

type Row = Record<string, unknown>;

export type CreateMemoryInput = {
  title: string;
  content: string;
  summary: string;
  category: string;
  importance: number;
  dedupeKey: string;
  sourceType?: string;
  sourceUri?: string;
  sourceHash?: string;
  excerpt?: string;
  conversationId?: string;
  messageId?: string;
};

export type UpdateMemoryInput = {
  title: string;
  content: string;
  summary: string;
  category: string;
  importance: number;
  changeReason?: string;
};

export type SaveMessageInput = {
  conversationId: string;
  role: string;
  content: string;
  status: string;
  finishReason?: string;
  promptTokens: number;
  completionTokens: number;
};

export type UsageInput = {
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
};

function mapUser(row: Row): AuthUserDto {
  return {
    id: bigintString(row.id) ?? '',
    issuer: textValue(row.issuer) ?? '',
    subject: textValue(row.subject) ?? '',
    displayName: textValue(row.display_name),
    emailHash: textValue(row.email_hash),
    createdAt: textValue(row.created_at) ?? '',
    updatedAt: textValue(row.updated_at) ?? '',
  };
}

function mapSettings(row: Row): UserSettingsDto {
  return {
    userId: bigintString(row.user_id) ?? '',
    defaultModel: textValue(row.default_model) ?? '',
    responseStyle: textValue(row.response_style) ?? 'concise',
    autoExtractMemories: row.auto_extract_memories === true,
    timezone: textValue(row.timezone) ?? 'UTC',
    maxPageSize: numberValue(row.max_page_size),
    createdAt: textValue(row.created_at) ?? '',
    updatedAt: textValue(row.updated_at) ?? '',
  };
}

function mapConversation(row: Row): ConversationDto {
  return {
    id: bigintString(row.id) ?? '',
    title: textValue(row.title) ?? '',
    status: textValue(row.status) ?? 'active',
    model: textValue(row.model) ?? '',
    createdAt: textValue(row.created_at) ?? '',
    updatedAt: textValue(row.updated_at) ?? '',
  };
}

function mapMessage(row: Row): MessageDto {
  return {
    id: bigintString(row.id) ?? '',
    conversationId: bigintString(row.conversation_id) ?? '',
    role: textValue(row.role) ?? 'user',
    content: textValue(row.content) ?? '',
    status: textValue(row.status) ?? 'complete',
    finishReason: textValue(row.finish_reason),
    promptTokens: numberValue(row.prompt_tokens),
    completionTokens: numberValue(row.completion_tokens),
    createdAt: textValue(row.created_at) ?? '',
  };
}

function mapMemory(row: Row): MemoryDto {
  return {
    id: bigintString(row.id) ?? '',
    title: textValue(row.title) ?? '',
    content: textValue(row.content) ?? '',
    summary: textValue(row.summary) ?? '',
    category: textValue(row.category) ?? 'knowledge',
    importance: numberValue(row.importance),
    dedupeKey: textValue(row.dedupe_key) ?? '',
    status: textValue(row.status) ?? 'active',
    createdAt: textValue(row.created_at) ?? '',
    updatedAt: textValue(row.updated_at) ?? '',
    lastAccessedAt: textValue(row.last_accessed_at),
  };
}

function mapSource(row: Row): MemorySourceDto {
  return {
    id: bigintString(row.id) ?? '',
    memoryId: bigintString(row.memory_id) ?? '',
    sourceType: textValue(row.source_type) ?? 'conversation',
    sourceUri: textValue(row.source_uri),
    sourceHash: textValue(row.source_hash),
    excerpt: textValue(row.excerpt),
    conversationId: bigintString(row.conversation_id),
    messageId: bigintString(row.message_id),
    createdAt: textValue(row.created_at) ?? '',
  };
}

function mapVersion(row: Row): MemoryVersionDto {
  return {
    id: bigintString(row.id) ?? '',
    memoryId: bigintString(row.memory_id) ?? '',
    version: numberValue(row.version),
    title: textValue(row.title) ?? '',
    content: textValue(row.content) ?? '',
    summary: textValue(row.summary) ?? '',
    category: textValue(row.category) ?? 'knowledge',
    changeReason: textValue(row.change_reason) ?? '',
    createdAt: textValue(row.created_at) ?? '',
  };
}

function mapRelation(row: Row): MemoryRelationDto {
  return {
    id: bigintString(row.id) ?? '',
    fromMemoryId: bigintString(row.from_memory_id) ?? '',
    toMemoryId: bigintString(row.to_memory_id) ?? '',
    relationType: textValue(row.relation_type) ?? 'related',
    strength: numberValue(row.strength),
    status: textValue(row.status) ?? 'active',
    createdAt: textValue(row.created_at) ?? '',
    updatedAt: textValue(row.updated_at) ?? '',
  };
}

function mapUsage(row: Row): AiUsageDto {
  return {
    id: bigintString(row.id) ?? '',
    conversationId: bigintString(row.conversation_id),
    messageId: bigintString(row.message_id),
    model: textValue(row.model) ?? '',
    operation: textValue(row.operation) ?? '',
    promptTokens: numberValue(row.prompt_tokens),
    completionTokens: numberValue(row.completion_tokens),
    totalTokens: numberValue(row.total_tokens),
    cachedTokens: numberValue(row.cached_tokens),
    reasoningTokens: numberValue(row.reasoning_tokens),
    costUsd: textValue(row.cost_usd) ?? '0',
    status: textValue(row.status) ?? 'success',
    errorCode: textValue(row.error_code),
    latencyMs: numberValue(row.latency_ms),
    generationId: textValue(row.generation_id),
    createdAt: textValue(row.created_at) ?? '',
  };
}

function mapActivity(row: Row): ActivityDto {
  return {
    id: bigintString(row.id) ?? '',
    action: textValue(row.action) ?? '',
    resourceType: textValue(row.resource_type) ?? '',
    resourceId: textValue(row.resource_id),
    metadataJson: textValue(row.metadata_json) ?? '{}',
    createdAt: textValue(row.created_at) ?? '',
  };
}

function numericLiteral(id: string): string {
  return BigInt(id).toString();
}

function u64Arg(value: string): number {
  return Number(BigInt(value));
}

function optionalU64Arg(value: string | undefined): number | undefined {
  return value === undefined || value === '' ? undefined : Number(BigInt(value));
}

export type AuthAccountRecord = {
  id: string;
  email: string;
  passwordHash: string;
  subject: string;
  displayName?: string;
};

function mapAuthAccount(row: Row): AuthAccountRecord {
  return {
    id: bigintString(row.id) ?? '',
    email: textValue(row.email) ?? '',
    passwordHash: textValue(row.password_hash) ?? '',
    subject: textValue(row.subject) ?? '',
    displayName: textValue(row.display_name),
  };
}

function sqlStringLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function satsOption<T>(value: T | undefined): { some: T } | { none: [] } {
  return value === undefined ? { none: [] } : { some: value };
}

export const repository = {
  async createAuthAccount(
    token: string,
    input: { email: string; passwordHash: string; subject: string; displayName?: string },
  ): Promise<void> {
    await callReducer(token, 'create_auth_account', [
      input.email,
      input.passwordHash,
      input.subject,
      satsOption(input.displayName),
    ]);
  },

  async findAuthAccountByEmail(token: string, email: string): Promise<AuthAccountRecord | undefined> {
    const rows = await queryRows(token, `SELECT * FROM auth_account_by_email(${sqlStringLiteral(email)});`);
    return rows[0] ? mapAuthAccount(rows[0]) : undefined;
  },

  async ensureUser(token: string, claims: AuthClaims, emailHash?: string): Promise<AuthUserDto | undefined> {
    await callReducer(token, 'ensure_user_profile', [
      claims.issuer,
      claims.subject,
      satsOption(claims.displayName),
      satsOption(emailHash),
    ]);
    return this.getProfile(token);
  },

  async getProfile(token: string): Promise<AuthUserDto | undefined> {
    const rows = await queryRows(token, 'SELECT * FROM my_user_profile;');
    return rows[0] ? mapUser(rows[0]) : undefined;
  },

  async getSettings(token: string): Promise<UserSettingsDto | undefined> {
    const rows = await queryRows(token, 'SELECT * FROM my_user_settings;');
    return rows[0] ? mapSettings(rows[0]) : undefined;
  },

  async updateSettings(
    token: string,
    settings: { defaultModel: string; responseStyle: string; autoExtractMemories: boolean; timezone: string; maxPageSize: number },
  ): Promise<void> {
    await callReducer(token, 'update_user_settings', [
      settings.defaultModel,
      settings.responseStyle,
      settings.autoExtractMemories,
      settings.timezone,
      settings.maxPageSize,
    ]);
  },

  async createConversation(token: string, title: string, model: string): Promise<ConversationDto | undefined> {
    await callReducer(token, 'create_conversation', [title, model]);
    const rows = await this.listConversations(token);
    return rows.reduce<ConversationDto | undefined>((newest, row) => {
      if (!newest) return row;
      return BigInt(row.id) > BigInt(newest.id) ? row : newest;
    }, undefined);
  },

  async listConversations(token: string): Promise<ConversationDto[]> {
    const rows = await queryRows(token, 'SELECT * FROM my_conversations;');
    return rows.map(mapConversation);
  },

  async getMessages(token: string, conversationId: string): Promise<MessageDto[]> {
    const rows = await queryRows(token, `SELECT * FROM conversation_messages(${numericLiteral(conversationId)});`);
    return rows.map(mapMessage);
  },

  async saveMessage(token: string, input: SaveMessageInput): Promise<void> {
    await callReducer(token, 'save_message', [
      u64Arg(input.conversationId),
      input.role,
      input.content,
      input.status,
      satsOption(input.finishReason),
      input.promptTokens,
      input.completionTokens,
    ]);
  },

  async deleteConversation(token: string, conversationId: string): Promise<void> {
    await callReducer(token, 'delete_conversation', [u64Arg(conversationId)]);
  },

  async createMemory(token: string, input: CreateMemoryInput): Promise<MemoryDto | undefined> {
    await callReducer(token, 'create_memory', [
      input.title,
      input.content,
      input.summary,
      input.category,
      input.importance,
      input.dedupeKey,
      satsOption(input.sourceType),
      satsOption(input.sourceUri),
      satsOption(input.sourceHash),
      satsOption(input.excerpt),
      satsOption(optionalU64Arg(input.conversationId)),
      satsOption(optionalU64Arg(input.messageId)),
    ]);
    const rows = await this.listMemories(token);
    return rows.find((row) => row.dedupeKey === input.dedupeKey);
  },

  async listMemories(token: string): Promise<MemoryDto[]> {
    const rows = await queryRows(token, 'SELECT * FROM my_memories;');
    return rows.map(mapMemory);
  },

  async getMemorySources(token: string, memoryId: string): Promise<MemorySourceDto[]> {
    const rows = await queryRows(token, `SELECT * FROM memory_sources(${numericLiteral(memoryId)});`);
    return rows.map(mapSource);
  },

  async getMemoryVersions(token: string, memoryId: string): Promise<MemoryVersionDto[]> {
    const rows = await queryRows(token, `SELECT * FROM memory_versions(${numericLiteral(memoryId)});`);
    return rows.map(mapVersion);
  },

  async updateMemory(token: string, memoryId: string, input: UpdateMemoryInput): Promise<void> {
    await callReducer(token, 'update_memory', [
      u64Arg(memoryId),
      input.title,
      input.content,
      input.summary,
      input.category,
      input.importance,
      input.changeReason ?? 'api-update',
    ]);
  },

  async archiveMemory(token: string, memoryId: string): Promise<void> {
    await callReducer(token, 'archive_memory', [u64Arg(memoryId)]);
  },

  async deleteMemory(token: string, memoryId: string): Promise<void> {
    await callReducer(token, 'delete_memory', [u64Arg(memoryId)]);
  },

  async listRelations(token: string): Promise<MemoryRelationDto[]> {
    const rows = await queryRows(token, 'SELECT * FROM my_memory_relations;');
    return rows.map(mapRelation);
  },

  async createRelation(
    token: string,
    input: { fromMemoryId: string; toMemoryId: string; relationType: string; strength: number },
  ): Promise<void> {
    await callReducer(token, 'create_memory_relation', [
      u64Arg(input.fromMemoryId),
      u64Arg(input.toMemoryId),
      input.relationType,
      input.strength,
    ]);
  },

  async updateRelationStatus(token: string, relationId: string, status: string): Promise<void> {
    await callReducer(token, 'update_memory_relation_status', [u64Arg(relationId), status]);
  },

  async recordUsage(token: string, input: UsageInput): Promise<void> {
    await callReducer(token, 'record_ai_usage', [
      satsOption(optionalU64Arg(input.conversationId)),
      satsOption(optionalU64Arg(input.messageId)),
      input.model,
      input.operation,
      input.promptTokens,
      input.completionTokens,
      input.totalTokens,
      input.cachedTokens,
      input.reasoningTokens,
      input.costUsd,
      input.status,
      satsOption(input.errorCode),
      input.latencyMs,
      satsOption(input.generationId),
    ]);
  },

  async listUsage(token: string): Promise<AiUsageDto[]> {
    const rows = await queryRows(token, 'SELECT * FROM my_ai_usage;');
    return rows.map(mapUsage);
  },

  async listActivity(token: string): Promise<ActivityDto[]> {
    const rows = await queryRows(token, 'SELECT * FROM my_activity;');
    return rows.map(mapActivity);
  },
};
