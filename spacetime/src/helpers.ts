import { SenderError, type InferSchema, type ReducerCtx } from 'spacetimedb/server';
import spacetimedb from './schema';

export type ModuleCtx = ReducerCtx<InferSchema<typeof spacetimedb>>;
export type ActivityMetadata = Record<string, string | number | boolean | null>;

export const MEMORY_CATEGORIES = [
  'personal information',
  'preferences',
  'projects',
  'tasks',
  'knowledge',
] as const;

export function rejectEmpty(value: string, field: string, maxLength = 20_000): string {
  const trimmed = value.trim();
  if (!trimmed) throw new SenderError(`${field} must not be empty`);
  if (trimmed.length > maxLength) throw new SenderError(`${field} is too long`);
  return trimmed;
}

export function optionalText(value: string | undefined, field: string, maxLength = 2_000): string | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  return rejectEmpty(value, field, maxLength);
}

export function boundedNumber(value: number, min: number, max: number, field: string): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new SenderError(`${field} is out of range`);
  }
  return value;
}

export function requireCategory(value: string): string {
  if (!MEMORY_CATEGORIES.includes(value as (typeof MEMORY_CATEGORIES)[number])) {
    throw new SenderError('Unsupported memory category');
  }
  return value;
}

export function requireBearerClaims(ctx: ModuleCtx) {
  const auth = ctx.senderAuth;
  if (auth.isInternal || !auth.hasJWT || !auth.jwt) {
    throw new SenderError('Authentication required');
  }

  const jwt = auth.jwt;
  const expectedIssuer = ctx.env.get('OIDC_ISSUER');
  if (expectedIssuer && jwt.issuer !== expectedIssuer) {
    throw new SenderError('Invalid token issuer');
  }

  const expectedAudience = ctx.env.get('OIDC_AUDIENCE');
  if (expectedAudience && !jwt.audience.includes(expectedAudience)) {
    throw new SenderError('Invalid token audience');
  }

  return jwt;
}

export function externalKey(issuer: string, subject: string): string {
  return `${issuer}\u0000${subject}`;
}

export function emailClaim(payload: Record<string, unknown>): string | undefined {
  const value = payload['email'];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function requireUser(ctx: ModuleCtx) {
  const user = ctx.db.user_profile.identity.find(ctx.sender);
  if (!user) throw new SenderError('User profile is not initialized');
  return user;
}

export function requireOwnedConversation(ctx: ModuleCtx, conversationId: bigint) {
  const owner = requireUser(ctx);
  const row = ctx.db.conversation.id.find(conversationId);
  if (!row || !row.owner_identity.isEqual(ctx.sender) || row.owner_user_id !== owner.id) {
    throw new SenderError('Conversation not found');
  }
  return row;
}

export function requireOwnedMemory(ctx: ModuleCtx, memoryId: bigint) {
  const owner = requireUser(ctx);
  const row = ctx.db.memory.id.find(memoryId);
  if (!row || !row.owner_identity.isEqual(ctx.sender) || row.owner_user_id !== owner.id) {
    throw new SenderError('Memory not found');
  }
  return row;
}

export function logActivity(
  ctx: ModuleCtx,
  action: string,
  resourceType: string,
  resourceId: string | undefined,
  metadata: ActivityMetadata,
): void {
  ctx.db.activity_log.insert({
    id: 0n,
    owner_identity: ctx.sender,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata_json: JSON.stringify(metadata),
    created_at: ctx.timestamp,
  });
}
