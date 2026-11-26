# ai-memory-hub

Next.js API + UI for chat, memories, relations, settings, and usage tracking backed by SpacetimeDB and OpenRouter.

## Ports

- SpacetimeDB: `127.0.0.1:3000`
- Next.js UI/API: `127.0.0.1:3001`
- JWKS and OIDC discovery: `http://127.0.0.1:3001/.well-known/...`

The port split is required because SpacetimeDB local mode and Next.js both default to `3000`.

## Setup

```bash
npm install
copy .env.example .env.local
```

Set a real `OPENROUTER_API_KEY` in `.env.local`. Do not commit `.env.local` or `.auth-key.json`.

Start SpacetimeDB and publish the module from the repository root:

```bash
spacetime start --root-dir <spacetime-cli-root>
spacetime publish ai-memory-hub-v2 --module-path ./spacetime
```

Do not start the local server with `--in-memory`; databases created there disappear on restart.

Then start the app:

```bash
npm run dev
```

`spacetime dev` can also be used; it starts the app via `npm run dev`.

## Auth

Traditional email/password auth is used. `POST /api/auth/register` and `POST /api/auth/login` set an HttpOnly `aimh_session` cookie. The browser client sends `credentials: 'include'`; API clients may alternatively send `Authorization: Bearer <token>`.

JWTs are RS256. For local development, signing keys are generated into `.auth-key.json` on first use and served through `/api/.well-known/jwks.json`. SpacetimeDB validates JWTs through the OIDC discovery document using `OIDC_ISSUER` and `OIDC_AUDIENCE`.

## Scripts

- `npm run dev` — Next.js dev server on port `3001`
- `npm run build` — production build
- `npm run start` — production server on port `3001`
- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint
- `npm test` — Vitest
- `npm run spacetime:generate` — regenerate typed bindings (informational; the HTTP layer uses raw JSON)
- `npm run spacetime:publish` — publish the SpacetimeDB module

## Main API groups

- `/api/auth` — register, login, logout, current user
- `/api/conversations` — conversation CRUD and messages
- `/api/chat` — streaming chat; returns `x-conversation-id`
- `/api/memories` — memory CRUD, list/filter, import, export
- `/api/memory-relations` — relation CRUD/status
- `/api/settings` — user settings
- `/api/ai/models`, `/api/ai/usage` — model catalog and usage history
