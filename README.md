# AI Memory Hub

A full-stack AI Memory Management application built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, **SpaceTimeDB**, and **OpenRouter** (via the OpenAI SDK).

## Features

- **User Authentication & Isolated Workspace:** Email/password registration and login (`/api/auth/register`, `/api/auth/login`) backed by `scrypt` password hashing, `HttpOnly` session cookies, and local RS256 JWT + OIDC/JWKS endpoints (`/.well-known/jwks.json`, `/.well-known/openid-configuration`).
- **AI Chat with Persistent Memory:** Streaming responses (`/api/chat`) using OpenRouter free and paid models (`/api/ai/models`), conversation history (`/api/conversations`), and automatic memory retrieval/context injection.
- **Automatic Memory Extraction:** Extracts durable facts, preferences, projects, tasks, and knowledge from conversations with category/importance normalization and a deterministic fallback.
- **Memory Management & Versioning:** Create, search, filter, edit, archive, and delete memories (`/api/memories`, `/api/memories/[id]`, `/api/memories/[id]/archive`) with full version history and source tracking.
- **Automatic Duplicate & Conflict Detection:** Automatically flags overlapping or contradicting memories (`duplicates`, `contradicts`) and lets you resolve relation statuses (`active`, `superseded`, `rejected`).
- **Real-Time Sync & Dashboard:** SpaceTimeDB WebSocket subscriptions (`DbConnection`) + polling fallback, category statistics, recent workspace activity (`/api/activity`), AI token usage (`/api/ai/usage`), and JSON export/import (`/api/memories/export`, `/api/memories/import`).
- **Workspace Settings:** Configurable default model, response style (`concise`, `detailed`, `technical`), auto-extraction toggle, timezone, and page size (`/api/settings`).

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React
- **Backend / API:** Next.js Route Handlers, Zod validation, `jose` (RS256 JWT/JWKS)
- **Database & Real-Time:** SpaceTimeDB (`spacetime/src/` module + generated TypeScript client)
- **AI Provider:** OpenAI SDK configured for OpenRouter (`https://openrouter.ai/api/v1`)
- **Testing & Quality:** Vitest, ESLint, TypeScript (`tsc --noEmit`)

## Project Structure

```text
spacetime/src/             # SpaceTimeDB tables, reducers, views, and helpers
src/app/
  .well-known/             # OIDC discovery & JWKS endpoints
  api/                     # REST & streaming API route handlers
  chat/, dashboard/,       # Next.js App Router pages
  memories/, settings/
src/components/
  ui/                      # Reusable UI primitives
  workspace/               # Auth, Chat, Dashboard, Memories, Settings views
src/lib/
  auth/                    # RS256 key management & password hashing
  openrouter/              # OpenRouter client & token/cost usage tracker
  spacetimedb/             # HTTP bridge, repository & generated client
  validation/              # Zod request schemas
src/modules/               # Auth, AI chat, conversations, memories, extraction, retrieval
tests/                     # Vitest unit & contract tests
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
SPACETIME_HTTP_URI=http://127.0.0.1:3000
SPACETIME_DB_NAME=ai-memory-hub
NEXT_PUBLIC_SPACETIME_WS_URI=ws://127.0.0.1:3000
NEXT_PUBLIC_SPACETIME_DB_NAME=ai-memory-hub

OIDC_ISSUER=http://127.0.0.1:3001
OIDC_AUDIENCE=ai-memory-hub
OIDC_JWKS_URL=http://127.0.0.1:3001/.well-known/jwks.json
SESSION_COOKIE_NAME=aimh_session

OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openrouter/free
OPENROUTER_EXTRACTION_MODEL=openrouter/free
OPENROUTER_APP_URL=http://localhost:3001
OPENROUTER_APP_TITLE=AI Memory Hub
AUTO_EXTRACT_MEMORIES=true
MODEL_CATALOG_TTL_MS=300000
MAX_CHAT_CONTEXT_MESSAGES=20
MAX_CHAT_CONTEXT_MEMORIES=12
```

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start SpaceTimeDB** (port `3000`) and publish the module:
   ```bash
   spacetime start --listen-addr 127.0.0.1:3000 --in-memory --non-interactive
   spacetime publish ai-memory-hub -p ./spacetime -s http://127.0.0.1:3000 --anonymous -y
   ```
3. **Start the Next.js app** (port `3001` so it doesn't conflict with SpaceTimeDB on `3000`):
   ```bash
   npx next dev -p 3001
   ```
4. Open `http://localhost:3001` in your browser.

## Scripts

```bash
npm run typecheck   # TypeScript check
npm test            # Run Vitest suite
npm run lint        # Run ESLint
npm run build       # Production Next.js build
```

## API Endpoints

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **Chat & AI:** `POST /api/chat`, `GET /api/ai/models`, `GET /api/ai/usage`
- **Conversations:** `GET /api/conversations`, `POST /api/conversations`, `GET /api/conversations/[id]`, `DELETE /api/conversations/[id]`
- **Memories:** `GET /api/memories`, `POST /api/memories`, `GET /api/memories/[id]`, `PATCH /api/memories/[id]`, `DELETE /api/memories/[id]`, `POST /api/memories/[id]/archive`, `GET /api/memories/export`, `POST /api/memories/import`
- **Relations:** `GET /api/memory-relations`, `POST /api/memory-relations`, `PATCH /api/memory-relations/[id]`
- **Activity & Settings:** `GET /api/activity`, `GET /api/settings`, `PATCH /api/settings`
- **OIDC:** `GET /.well-known/openid-configuration`, `GET /.well-known/jwks.json`

## Production Deployment (SpaceTimeDB Cloud + Render)

1. Update `env.OIDC_ISSUER` in `spacetime.json` to your live HTTPS URL (e.g. `https://ai-memory-hub.onrender.com`).
2. Publish the SpaceTimeDB module to `maincloud`:
   ```bash
   spacetime login
   spacetime publish ai-memory-hub -p ./spacetime -s maincloud
   ```
3. Deploy Next.js on Render (`npm install && npm run build`, start with `npm run start`) with `SPACETIME_HTTP_URI=https://maincloud.spacetimedb.com`, `NEXT_PUBLIC_SPACETIME_WS_URI=wss://maincloud.spacetimedb.com`, and matching `OIDC_ISSUER` / `OIDC_JWKS_URL` / `OPENROUTER_API_KEY`.
