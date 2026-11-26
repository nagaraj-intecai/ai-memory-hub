import { schema, t } from 'spacetimedb/server';
import {
  activity_log,
  ai_usage_log,
  auth_account,
  auth_service_identity,
  conversation,
  memory,
  memory_relation,
  memory_source,
  memory_version,
  message,
  user_profile,
  user_settings,
} from './tables';

const spacetimedb = schema(
  {
    auth_account,
    auth_service_identity,
    user_profile,
    user_settings,
    conversation,
    message,
    memory,
    memory_source,
    memory_version,
    memory_relation,
    ai_usage_log,
    activity_log,
  },
  {
    env: {
      OIDC_ISSUER: t.string().optional(),
      OIDC_AUDIENCE: t.string().optional(),
    },
  },
);

export default spacetimedb;
