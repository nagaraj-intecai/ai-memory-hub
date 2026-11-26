import { t } from 'spacetimedb/server';
import spacetimedb from './schema';
import {
  activity_log,
  ai_usage_log,
  auth_account,
  conversation,
  memory,
  memory_relation,
  memory_source,
  memory_version,
  message,
  user_profile,
  user_settings,
} from './tables';

export const authAccountByEmail = spacetimedb.view(
  { name: 'auth_account_by_email', public: true },
  { email: t.string() },
  t.option(auth_account.rowType),
  (ctx, { email }) => {
    const service = ctx.db.auth_service_identity.id.find(1n);
    if (!service || !ctx.sender.isEqual(service.identity)) return undefined;
    return ctx.db.auth_account.email.find(email.trim().toLowerCase()) ?? undefined;
  },
);

export const myUserProfile = spacetimedb.view(
  { name: 'my_user_profile', public: true },
  t.option(user_profile.rowType),
  (ctx) => ctx.db.user_profile.identity.find(ctx.sender) ?? undefined,
);

export const myUserSettings = spacetimedb.view(
  { name: 'my_user_settings', public: true },
  t.option(user_settings.rowType),
  (ctx) => ctx.db.user_settings.identity.find(ctx.sender) ?? undefined,
);

export const myConversations = spacetimedb.view(
  { name: 'my_conversations', public: true },
  t.array(conversation.rowType),
  (ctx) => Array.from(ctx.db.conversation.owner_identity.filter(ctx.sender)).sort((a, b) => (a.id < b.id ? 1 : -1)),
);

export const conversationMessages = spacetimedb.view(
  { name: 'conversation_messages', public: true },
  { conversationId: t.u64() },
  t.array(message.rowType),
  (ctx, { conversationId }) =>
    Array.from(ctx.db.message.conversation_id.filter(conversationId))
      .filter((row) => row.owner_identity.isEqual(ctx.sender))
      .sort((a, b) => (a.id < b.id ? 1 : -1)),
);

export const myMemories = spacetimedb.view(
  { name: 'my_memories', public: true },
  t.array(memory.rowType),
  (ctx) => Array.from(ctx.db.memory.owner_identity.filter(ctx.sender)).sort((a, b) => (a.id < b.id ? 1 : -1)),
);

export const memorySources = spacetimedb.view(
  { name: 'memory_sources', public: true },
  { memoryId: t.u64() },
  t.array(memory_source.rowType),
  (ctx, { memoryId }) =>
    Array.from(ctx.db.memory_source.memory_id.filter(memoryId))
      .filter((row) => row.owner_identity.isEqual(ctx.sender))
      .sort((a, b) => (a.id < b.id ? 1 : -1)),
);

export const memoryVersions = spacetimedb.view(
  { name: 'memory_versions', public: true },
  { memoryId: t.u64() },
  t.array(memory_version.rowType),
  (ctx, { memoryId }) =>
    Array.from(ctx.db.memory_version.memory_id.filter(memoryId))
      .filter((row) => row.owner_identity.isEqual(ctx.sender))
      .sort((a, b) => (a.version < b.version ? 1 : -1)),
);

export const myMemoryRelations = spacetimedb.view(
  { name: 'my_memory_relations', public: true },
  t.array(memory_relation.rowType),
  (ctx) => Array.from(ctx.db.memory_relation.owner_identity.filter(ctx.sender)).sort((a, b) => (a.id < b.id ? 1 : -1)),
);

export const myAiUsage = spacetimedb.view(
  { name: 'my_ai_usage', public: true },
  t.array(ai_usage_log.rowType),
  (ctx) => Array.from(ctx.db.ai_usage_log.owner_identity.filter(ctx.sender)).sort((a, b) => (a.id < b.id ? 1 : -1)),
);

export const myActivity = spacetimedb.view(
  { name: 'my_activity', public: true },
  t.array(activity_log.rowType),
  (ctx) => Array.from(ctx.db.activity_log.owner_identity.filter(ctx.sender)).sort((a, b) => (a.id < b.id ? 1 : -1)),
);
