import { SenderError, t } from 'spacetimedb/server';
import spacetimedb from './schema';
import {
  boundedNumber,
  emailClaim,
  externalKey,
  logActivity,
  optionalText,
  requireBearerClaims,
  requireCategory,
  requireOwnedConversation,
  requireOwnedMemory,
  requireUser,
  rejectEmpty,
  type ModuleCtx,
} from './helpers';

const VALID_ROLES = ['user', 'assistant', 'system', 'tool'];
const VALID_MESSAGE_STATUSES = ['pending', 'complete', 'error'];
const VALID_RELATION_TYPES = ['related', 'supports', 'contradicts', 'causes', 'duplicates'];
const VALID_RELATION_STATUSES = ['active', 'superseded', 'rejected'];
const VALID_USAGE_STATUSES = ['success', 'error'];

function optionalString(value: string | undefined): string | undefined {
  return value === undefined ? undefined : value;
}

function nextVersion(ctx: ModuleCtx, memoryId: bigint): number {
  let max = 0;
  for (const version of ctx.db.memory_version.memory_id.filter(memoryId)) {
    if (version.version > max) max = version.version;
  }
  return max + 1;
}

function insertVersion(
  ctx: ModuleCtx,
  memoryId: bigint,
  title: string,
  content: string,
  summary: string,
  category: string,
  changeReason: string,
): void {
  ctx.db.memory_version.insert({
    id: 0n,
    memory_id: memoryId,
    owner_identity: ctx.sender,
    version: nextVersion(ctx, memoryId),
    title,
    content,
    summary,
    category,
    change_reason: changeReason,
    created_at: ctx.timestamp,
  });
}

function requireRole(value: string): string {
  if (!VALID_ROLES.includes(value)) throw new SenderError('Unsupported message role');
  return value;
}

function requireMessageStatus(value: string): string {
  if (!VALID_MESSAGE_STATUSES.includes(value)) throw new SenderError('Unsupported message status');
  return value;
}

function requireRelationType(value: string): string {
  if (!VALID_RELATION_TYPES.includes(value)) throw new SenderError('Unsupported relation type');
  return value;
}

function requireRelationStatus(value: string): string {
  if (!VALID_RELATION_STATUSES.includes(value)) throw new SenderError('Unsupported relation status');
  return value;
}

function requireUsageStatus(value: string): string {
  if (!VALID_USAGE_STATUSES.includes(value)) throw new SenderError('Unsupported usage status');
  return value;
}

export const createAuthAccount = spacetimedb.reducer(
  {
    email: t.string(),
    passwordHash: t.string(),
    subject: t.string(),
    displayName: t.string().optional(),
  },
  (ctx, { email, passwordHash, subject, displayName }) => {
    const jwt = requireBearerClaims(ctx);
    if (jwt.subject !== 'auth-service') {
      throw new SenderError('Forbidden');
    }

    const service = ctx.db.auth_service_identity.id.find(1n);
    if (!service) {
      ctx.db.auth_service_identity.insert({ id: 1n, identity: ctx.sender, created_at: ctx.timestamp });
    } else if (!ctx.sender.isEqual(service.identity)) {
      throw new SenderError('Forbidden');
    }

    const normalizedEmail = rejectEmpty(email, 'email', 320).toLowerCase();
    if (ctx.db.auth_account.email.find(normalizedEmail)) {
      throw new SenderError('Email is already registered');
    }

    ctx.db.auth_account.insert({
      id: 0n,
      email: normalizedEmail,
      password_hash: rejectEmpty(passwordHash, 'passwordHash', 500),
      subject: rejectEmpty(subject, 'subject', 200),
      display_name: optionalText(displayName, 'displayName', 200),
      created_at: ctx.timestamp,
      updated_at: ctx.timestamp,
    });
  },
);

export const ensureUserProfile = spacetimedb.reducer(
  {
    issuer: t.string(),
    subject: t.string(),
    displayName: t.string().optional(),
    emailHash: t.string().optional(),
  },
  (ctx, { issuer, subject, displayName, emailHash }) => {
    const jwt = requireBearerClaims(ctx);
    if (jwt.issuer !== issuer || jwt.subject !== subject) {
      throw new SenderError('Token claims do not match request');
    }

    const key = externalKey(issuer, subject);
    if (!ctx.db.user_profile.identity.find(ctx.sender)) {
      if (ctx.db.user_profile.external_key.find(key)) {
        throw new SenderError('Identity subject is already linked');
      }
      ctx.db.user_profile.insert({
        id: 0n,
        identity: ctx.sender,
        external_key: key,
        issuer,
        subject,
        display_name: optionalText(displayName, 'displayName', 200),
        email_hash: optionalString(emailHash),
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
      });
    } else {
      const user = requireUser(ctx);
      user.display_name = optionalText(displayName, 'displayName', 200) ?? user.display_name;
      user.email_hash = emailClaim(jwt.fullPayload) ? emailHash : user.email_hash;
      user.updated_at = ctx.timestamp;
      ctx.db.user_profile.id.update(user);
    }

    const user = requireUser(ctx);
    if (!ctx.db.user_settings.user_id.find(user.id)) {
      ctx.db.user_settings.insert({
        user_id: user.id,
        identity: ctx.sender,
        default_model: '',
        response_style: 'concise',
        auto_extract_memories: true,
        timezone: 'UTC',
        max_page_size: 50,
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
      });
    }
  },
);

export const createConversation = spacetimedb.reducer(
  {
    title: t.string(),
    model: t.string(),
  },
  (ctx, { title, model }) => {
    const user = requireUser(ctx);
    const row = ctx.db.conversation.insert({
      id: 0n,
      owner_identity: ctx.sender,
      owner_user_id: user.id,
      title: rejectEmpty(title, 'title', 200),
      status: 'active',
      model: rejectEmpty(model, 'model', 200),
      created_at: ctx.timestamp,
      updated_at: ctx.timestamp,
    });
    logActivity(ctx, 'conversation.created', 'conversation', row.id.toString(), { model });
  },
);

export const saveMessage = spacetimedb.reducer(
  {
    conversationId: t.u64(),
    role: t.string(),
    content: t.string(),
    status: t.string(),
    finishReason: t.string().optional(),
    promptTokens: t.u32(),
    completionTokens: t.u32(),
  },
  (ctx, args) => {
    const user = requireUser(ctx);
    const conversationRow = requireOwnedConversation(ctx, args.conversationId);
    const role = requireRole(args.role);
    const status = requireMessageStatus(args.status);
    const content = rejectEmpty(args.content, 'content', 100_000);
    const promptTokens = boundedNumber(args.promptTokens, 0, 10_000_000, 'promptTokens');
    const completionTokens = boundedNumber(args.completionTokens, 0, 10_000_000, 'completionTokens');

    ctx.db.message.insert({
      id: 0n,
      conversation_id: conversationRow.id,
      owner_identity: ctx.sender,
      owner_user_id: user.id,
      role,
      content,
      status,
      finish_reason: optionalText(args.finishReason, 'finishReason', 200),
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      created_at: ctx.timestamp,
    });

    conversationRow.updated_at = ctx.timestamp;
    ctx.db.conversation.id.update(conversationRow);
    logActivity(ctx, 'message.saved', 'message', conversationRow.id.toString(), { role, status });
  },
);

export const deleteConversation = spacetimedb.reducer({ conversationId: t.u64() }, (ctx, { conversationId }) => {
  requireOwnedConversation(ctx, conversationId);
  ctx.db.message.conversation_id.delete(conversationId);
  ctx.db.conversation.id.delete(conversationId);
  logActivity(ctx, 'conversation.deleted', 'conversation', conversationId.toString(), {});
});

export const createMemory = spacetimedb.reducer(
  {
    title: t.string(),
    content: t.string(),
    summary: t.string(),
    category: t.string(),
    importance: t.u32(),
    dedupeKey: t.string(),
    sourceType: t.string().optional(),
    sourceUri: t.string().optional(),
    sourceHash: t.string().optional(),
    excerpt: t.string().optional(),
    conversationId: t.u64().optional(),
    messageId: t.u64().optional(),
  },
  (ctx, args) => {
    const user = requireUser(ctx);
    const dedupeKey = rejectEmpty(args.dedupeKey, 'dedupeKey', 512);
    for (const existing of ctx.db.memory.dedupe_key.filter(dedupeKey)) {
      if (existing.owner_identity.isEqual(ctx.sender)) {
        throw new SenderError('Memory already exists for this dedupe key');
      }
    }

    if (args.conversationId !== undefined) requireOwnedConversation(ctx, args.conversationId);
    if (args.messageId !== undefined) {
      const sourceMessage = ctx.db.message.id.find(args.messageId);
      if (!sourceMessage || !sourceMessage.owner_identity.isEqual(ctx.sender)) {
        throw new SenderError('Message not found');
      }
      if (args.conversationId !== undefined && sourceMessage.conversation_id !== args.conversationId) {
        throw new SenderError('Message does not belong to conversation');
      }
    }

    const row = ctx.db.memory.insert({
      id: 0n,
      owner_identity: ctx.sender,
      owner_user_id: user.id,
      title: rejectEmpty(args.title, 'title', 300),
      content: rejectEmpty(args.content, 'content', 50_000),
      summary: rejectEmpty(args.summary, 'summary', 2_000),
      category: requireCategory(args.category),
      importance: boundedNumber(args.importance, 0, 100, 'importance'),
      dedupe_key: dedupeKey,
      status: 'active',
      created_at: ctx.timestamp,
      updated_at: ctx.timestamp,
      last_accessed_at: undefined,
    });

    insertVersion(ctx, row.id, row.title, row.content, row.summary, row.category, 'created');

    if (args.sourceType !== undefined) {
      ctx.db.memory_source.insert({
        id: 0n,
        memory_id: row.id,
        owner_identity: ctx.sender,
        source_type: rejectEmpty(args.sourceType, 'sourceType', 100),
        source_uri: optionalText(args.sourceUri, 'sourceUri', 2_000),
        source_hash: optionalText(args.sourceHash, 'sourceHash', 200) ?? '',
        excerpt: optionalText(args.excerpt, 'excerpt', 4_000),
        conversation_id: args.conversationId,
        message_id: args.messageId,
        created_at: ctx.timestamp,
      });
    }

    logActivity(ctx, 'memory.created', 'memory', row.id.toString(), { category: row.category });
  },
);

export const createMemoryVersion = spacetimedb.reducer(
  {
    memoryId: t.u64(),
    title: t.string(),
    content: t.string(),
    summary: t.string(),
    category: t.string(),
    changeReason: t.string().optional(),
  },
  (ctx, args) => {
    const row = requireOwnedMemory(ctx, args.memoryId);
    const title = rejectEmpty(args.title, 'title', 300);
    const content = rejectEmpty(args.content, 'content', 50_000);
    const summary = rejectEmpty(args.summary, 'summary', 2_000);
    const category = requireCategory(args.category);
    const changeReason = optionalText(args.changeReason, 'changeReason', 200) ?? 'manual';

    insertVersion(ctx, row.id, title, content, summary, category, changeReason);
    logActivity(ctx, 'memory_version.created', 'memory', row.id.toString(), { category });
  },
);

export const updateMemory = spacetimedb.reducer(
  {
    memoryId: t.u64(),
    title: t.string(),
    content: t.string(),
    summary: t.string(),
    category: t.string(),
    importance: t.u32(),
    changeReason: t.string(),
  },
  (ctx, args) => {
    const row = requireOwnedMemory(ctx, args.memoryId);
    row.title = rejectEmpty(args.title, 'title', 300);
    row.content = rejectEmpty(args.content, 'content', 50_000);
    row.summary = rejectEmpty(args.summary, 'summary', 2_000);
    row.category = requireCategory(args.category);
    row.importance = boundedNumber(args.importance, 0, 100, 'importance');
    row.updated_at = ctx.timestamp;
    ctx.db.memory.id.update(row);
    insertVersion(ctx, row.id, row.title, row.content, row.summary, row.category, optionalText(args.changeReason, 'changeReason', 200) ?? 'updated');
    logActivity(ctx, 'memory.updated', 'memory', row.id.toString(), {});
  },
);

export const archiveMemory = spacetimedb.reducer({ memoryId: t.u64() }, (ctx, { memoryId }) => {
  const row = requireOwnedMemory(ctx, memoryId);
  row.status = 'archived';
  row.updated_at = ctx.timestamp;
  ctx.db.memory.id.update(row);
  logActivity(ctx, 'memory.archived', 'memory', memoryId.toString(), {});
});

export const deleteMemory = spacetimedb.reducer({ memoryId: t.u64() }, (ctx, { memoryId }) => {
  requireOwnedMemory(ctx, memoryId);
  ctx.db.memory_source.memory_id.delete(memoryId);
  ctx.db.memory_version.memory_id.delete(memoryId);
  for (const relation of ctx.db.memory_relation.from_memory_id.filter(memoryId)) {
    ctx.db.memory_relation.id.delete(relation.id);
  }
  for (const relation of ctx.db.memory_relation.to_memory_id.filter(memoryId)) {
    ctx.db.memory_relation.id.delete(relation.id);
  }
  ctx.db.memory.id.delete(memoryId);
  logActivity(ctx, 'memory.deleted', 'memory', memoryId.toString(), {});
});

export const createMemoryRelation = spacetimedb.reducer(
  {
    fromMemoryId: t.u64(),
    toMemoryId: t.u64(),
    relationType: t.string(),
    strength: t.f64(),
  },
  (ctx, args) => {
    const user = requireUser(ctx);
    requireOwnedMemory(ctx, args.fromMemoryId);
    requireOwnedMemory(ctx, args.toMemoryId);
    if (args.fromMemoryId === args.toMemoryId) throw new SenderError('A memory cannot relate to itself');

    const relationType = requireRelationType(args.relationType);
    const strength = boundedNumber(args.strength, 0, 1, 'strength');
    for (const existing of ctx.db.memory_relation.from_memory_id.filter(args.fromMemoryId)) {
      if (existing.to_memory_id === args.toMemoryId && existing.relation_type === relationType) {
        throw new SenderError('Relation already exists');
      }
    }

    const row = ctx.db.memory_relation.insert({
      id: 0n,
      owner_identity: ctx.sender,
      owner_user_id: user.id,
      from_memory_id: args.fromMemoryId,
      to_memory_id: args.toMemoryId,
      relation_type: relationType,
      strength,
      status: 'active',
      created_at: ctx.timestamp,
      updated_at: ctx.timestamp,
    });
    logActivity(ctx, 'memory_relation.created', 'memory_relation', row.id.toString(), { relationType });
  },
);

export const updateMemoryRelationStatus = spacetimedb.reducer(
  {
    relationId: t.u64(),
    status: t.string(),
  },
  (ctx, args) => {
    const row = ctx.db.memory_relation.id.find(args.relationId);
    if (!row || !row.owner_identity.isEqual(ctx.sender)) {
      throw new SenderError('Relation not found');
    }
    row.status = requireRelationStatus(args.status);
    row.updated_at = ctx.timestamp;
    ctx.db.memory_relation.id.update(row);
    logActivity(ctx, 'memory_relation.status_updated', 'memory_relation', args.relationId.toString(), { status: row.status });
  },
);

export const updateUserSettings = spacetimedb.reducer(
  {
    defaultModel: t.string(),
    responseStyle: t.string(),
    autoExtractMemories: t.bool(),
    timezone: t.string(),
    maxPageSize: t.u32(),
  },
  (ctx, args) => {
    const user = requireUser(ctx);
    const maxPageSize = boundedNumber(args.maxPageSize, 1, 200, 'maxPageSize');
    const existing = ctx.db.user_settings.user_id.find(user.id);
    const defaultModel = optionalText(args.defaultModel, 'defaultModel', 200) ?? '';
    const responseStyle = rejectEmpty(args.responseStyle, 'responseStyle', 100);
    const timezone = rejectEmpty(args.timezone, 'timezone', 100);

    if (existing) {
      existing.default_model = defaultModel;
      existing.response_style = responseStyle;
      existing.auto_extract_memories = args.autoExtractMemories;
      existing.timezone = timezone;
      existing.max_page_size = maxPageSize;
      existing.updated_at = ctx.timestamp;
      ctx.db.user_settings.user_id.update(existing);
    } else {
      ctx.db.user_settings.insert({
        user_id: user.id,
        identity: ctx.sender,
        default_model: defaultModel,
        response_style: responseStyle,
        auto_extract_memories: args.autoExtractMemories,
        timezone,
        max_page_size: maxPageSize,
        created_at: ctx.timestamp,
        updated_at: ctx.timestamp,
      });
    }
    logActivity(ctx, 'user_settings.updated', 'user_settings', user.id.toString(), {});
  },
);

export const recordAiUsage = spacetimedb.reducer(
  {
    conversationId: t.u64().optional(),
    messageId: t.u64().optional(),
    model: t.string(),
    operation: t.string(),
    promptTokens: t.u32(),
    completionTokens: t.u32(),
    totalTokens: t.u32(),
    cachedTokens: t.u32(),
    reasoningTokens: t.u32(),
    costUsd: t.string(),
    status: t.string(),
    errorCode: t.string().optional(),
    latencyMs: t.u32(),
    generationId: t.string().optional(),
  },
  (ctx, args) => {
    const user = requireUser(ctx);
    if (args.conversationId !== undefined) requireOwnedConversation(ctx, args.conversationId);
    if (args.messageId !== undefined) {
      const sourceMessage = ctx.db.message.id.find(args.messageId);
      if (!sourceMessage || !sourceMessage.owner_identity.isEqual(ctx.sender)) {
        throw new SenderError('Message not found');
      }
      if (args.conversationId !== undefined && sourceMessage.conversation_id !== args.conversationId) {
        throw new SenderError('Message does not belong to conversation');
      }
    }

    ctx.db.ai_usage_log.insert({
      id: 0n,
      owner_identity: ctx.sender,
      owner_user_id: user.id,
      conversation_id: args.conversationId,
      message_id: args.messageId,
      model: rejectEmpty(args.model, 'model', 200),
      operation: rejectEmpty(args.operation, 'operation', 100),
      prompt_tokens: boundedNumber(args.promptTokens, 0, 10_000_000, 'promptTokens'),
      completion_tokens: boundedNumber(args.completionTokens, 0, 10_000_000, 'completionTokens'),
      total_tokens: boundedNumber(args.totalTokens, 0, 20_000_000, 'totalTokens'),
      cached_tokens: boundedNumber(args.cachedTokens, 0, 10_000_000, 'cachedTokens'),
      reasoning_tokens: boundedNumber(args.reasoningTokens, 0, 10_000_000, 'reasoningTokens'),
      cost_usd: rejectEmpty(args.costUsd, 'costUsd', 50),
      status: requireUsageStatus(args.status),
      error_code: optionalText(args.errorCode, 'errorCode', 200),
      latency_ms: boundedNumber(args.latencyMs, 0, 600_000, 'latencyMs'),
      generation_id: optionalText(args.generationId, 'generationId', 200),
      created_at: ctx.timestamp,
    });
  },
);
