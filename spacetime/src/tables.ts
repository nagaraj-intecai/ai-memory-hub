import { table, t } from 'spacetimedb/server';

export const auth_account = table(
  { name: 'auth_account' },
  {
    id: t.u64().primaryKey().autoInc(),
    email: t.string().unique(),
    password_hash: t.string(),
    subject: t.string().unique(),
    display_name: t.string().optional(),
    created_at: t.timestamp(),
    updated_at: t.timestamp(),
  },
);

export const auth_service_identity = table(
  { name: 'auth_service_identity' },
  {
    id: t.u64().primaryKey(),
    identity: t.identity().unique(),
    created_at: t.timestamp(),
  },
);

export const user_profile = table(
  { name: 'user_profile' },
  {
    id: t.u64().primaryKey().autoInc(),
    identity: t.identity().unique(),
    external_key: t.string().unique(),
    issuer: t.string().index('btree'),
    subject: t.string().index('btree'),
    display_name: t.string().optional(),
    email_hash: t.string().optional(),
    created_at: t.timestamp(),
    updated_at: t.timestamp(),
  },
);

export const user_settings = table(
  { name: 'user_settings' },
  {
    user_id: t.u64().primaryKey(),
    identity: t.identity().unique(),
    default_model: t.string(),
    response_style: t.string(),
    auto_extract_memories: t.bool(),
    timezone: t.string(),
    max_page_size: t.u32(),
    created_at: t.timestamp(),
    updated_at: t.timestamp(),
  },
);

export const conversation = table(
  { name: 'conversation' },
  {
    id: t.u64().primaryKey().autoInc(),
    owner_identity: t.identity().index('btree'),
    owner_user_id: t.u64().index('btree'),
    title: t.string(),
    status: t.string().index('btree'),
    model: t.string(),
    created_at: t.timestamp(),
    updated_at: t.timestamp(),
  },
);

export const message = table(
  { name: 'message' },
  {
    id: t.u64().primaryKey().autoInc(),
    conversation_id: t.u64().index('btree'),
    owner_identity: t.identity().index('btree'),
    owner_user_id: t.u64(),
    role: t.string().index('btree'),
    content: t.string(),
    status: t.string().index('btree'),
    finish_reason: t.string().optional(),
    prompt_tokens: t.u32(),
    completion_tokens: t.u32(),
    created_at: t.timestamp(),
  },
);

export const memory = table(
  { name: 'memory' },
  {
    id: t.u64().primaryKey().autoInc(),
    owner_identity: t.identity().index('btree'),
    owner_user_id: t.u64().index('btree'),
    title: t.string(),
    content: t.string(),
    summary: t.string(),
    category: t.string().index('btree'),
    importance: t.u32().index('btree'),
    dedupe_key: t.string().index('btree'),
    status: t.string().index('btree'),
    created_at: t.timestamp(),
    updated_at: t.timestamp(),
    last_accessed_at: t.timestamp().optional(),
  },
);

export const memory_source = table(
  { name: 'memory_source' },
  {
    id: t.u64().primaryKey().autoInc(),
    memory_id: t.u64().index('btree'),
    owner_identity: t.identity().index('btree'),
    source_type: t.string().index('btree'),
    source_uri: t.string().optional(),
    source_hash: t.string().index('btree'),
    excerpt: t.string().optional(),
    conversation_id: t.u64().optional(),
    message_id: t.u64().optional(),
    created_at: t.timestamp(),
  },
);

export const memory_version = table(
  { name: 'memory_version' },
  {
    id: t.u64().primaryKey().autoInc(),
    memory_id: t.u64().index('btree'),
    owner_identity: t.identity().index('btree'),
    version: t.u32(),
    title: t.string(),
    content: t.string(),
    summary: t.string(),
    category: t.string(),
    change_reason: t.string(),
    created_at: t.timestamp(),
  },
);

export const memory_relation = table(
  { name: 'memory_relation' },
  {
    id: t.u64().primaryKey().autoInc(),
    owner_identity: t.identity().index('btree'),
    owner_user_id: t.u64().index('btree'),
    from_memory_id: t.u64().index('btree'),
    to_memory_id: t.u64().index('btree'),
    relation_type: t.string().index('btree'),
    strength: t.f64(),
    status: t.string().index('btree'),
    created_at: t.timestamp(),
    updated_at: t.timestamp(),
  },
);

export const ai_usage_log = table(
  { name: 'ai_usage_log' },
  {
    id: t.u64().primaryKey().autoInc(),
    owner_identity: t.identity().index('btree'),
    owner_user_id: t.u64().index('btree'),
    conversation_id: t.u64().optional(),
    message_id: t.u64().optional(),
    model: t.string().index('btree'),
    operation: t.string().index('btree'),
    prompt_tokens: t.u32(),
    completion_tokens: t.u32(),
    total_tokens: t.u32(),
    cached_tokens: t.u32(),
    reasoning_tokens: t.u32(),
    cost_usd: t.string(),
    status: t.string().index('btree'),
    error_code: t.string().optional(),
    latency_ms: t.u32(),
    generation_id: t.string().optional(),
    created_at: t.timestamp(),
  },
);

export const activity_log = table(
  { name: 'activity_log' },
  {
    id: t.u64().primaryKey().autoInc(),
    owner_identity: t.identity().index('btree'),
    action: t.string().index('btree'),
    resource_type: t.string().index('btree'),
    resource_id: t.string().optional(),
    metadata_json: t.string(),
    created_at: t.timestamp(),
  },
);
