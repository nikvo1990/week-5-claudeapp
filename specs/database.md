# Database Spec — DocAI Supabase Schema

## Feature Name
DocAI Database — Supabase PostgreSQL schema for users, sessions, messages, and feedback.

---

## Description

- **Provider:** Supabase (PostgreSQL, hosted)
- **Setup approach:** All tables created manually via the Supabase SQL editor — no migrations framework
- **Auth:** Custom `users` table only — do not use Supabase Auth (`auth.users`)
- **RLS:** Disabled for MVP; the anon key is used server-side only. Enable per-user RLS policies before public launch.
- **Client:** Single shared Supabase JS client in `lib/supabase.ts`, imported by all DB helper functions in `lib/db.ts`

---

## Tables

### `users`
Stores registered users. Passwords are bcrypt-hashed before storage.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `email` | TEXT | UNIQUE, NOT NULL |
| `password_hash` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

### `sessions`
One row per chat session. A session belongs to one user and contains many messages.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `user_id` | UUID | NOT NULL, FK → `users(id)` ON DELETE CASCADE |
| `title` | TEXT | NOT NULL, DEFAULT `'New session'` |
| `status` | TEXT | NOT NULL, DEFAULT `'idle'`, CHECK IN `('idle','processing','completed','error')` |
| `pinned` | BOOLEAN | NOT NULL, DEFAULT `false` |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` |

Note: `updated_at` is manually set to `now()` whenever a new message is created for this session — there is no DB trigger in MVP.

### `messages`
One row per chat message (user or assistant turn).

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `session_id` | UUID | NOT NULL, FK → `sessions(id)` ON DELETE CASCADE |
| `role` | TEXT | NOT NULL, CHECK IN `('user','assistant')` |
| `content` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

### `feedback`
One row per feedback submission. Linked to the session; there is no message-level foreign key in the current schema (feedback is per session, not per message).

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `user_id` | UUID | NOT NULL, FK → `users(id)` ON DELETE CASCADE |
| `session_id` | UUID | NOT NULL, FK → `sessions(id)` ON DELETE CASCADE |
| `rating` | INTEGER | NOT NULL, CHECK `BETWEEN 1 AND 5` |
| `comment` | TEXT | NULLABLE |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

---

## SQL to Create All Tables

Run this in the Supabase SQL editor (Project → SQL Editor → New query):

```sql
-- Users (custom auth, no Supabase Auth)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Sessions
CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'New session',
  status     TEXT NOT NULL DEFAULT 'idle'
               CHECK (status IN ('idle','processing','completed','error')),
  pinned     BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback
CREATE TABLE feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX ON sessions(user_id, updated_at DESC);
CREATE INDEX ON messages(session_id, created_at ASC);
CREATE INDEX ON feedback(session_id);
```

---

## Environment Variables

| Variable | Value | Where to find it | Required before dev server? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API → Project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase Dashboard → Settings → API → Project API keys → anon public | Yes |

Both variables are prefixed `NEXT_PUBLIC_` so they are available in server-side API routes via `process.env`. They are safe to expose because all actual DB operations use the anon key server-side only (API routes).

---

## Client Initialization

**File:** `lib/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- The client is a module-level singleton — created once on import
- All DB helpers in `lib/db.ts` import `supabase` from this file
- Do NOT call `createClient` anywhere else in the codebase
- If env vars are missing the app will crash on first DB call — ensure `.env.local` is populated before starting the dev server

---

## Helper Functions

All defined in `lib/db.ts`. All functions are async and return typed objects.

| Function | Table | Parameters | Returns |
|---|---|---|---|
| `getUser(email)` | `users` | `email: string` | `User \| null` |
| `createUser(email, passwordHash)` | `users` | `email: string, passwordHash: string` | `User` |
| `createSession(userId, title)` | `sessions` | `userId: string, title: string` | `Session` |
| `getSessions(userId)` | `sessions` | `userId: string` | `Session[]` (ordered by `updated_at DESC`) |
| `createMessage(sessionId, role, content)` | `messages` + `sessions` | `sessionId: string, role: 'user'\|'assistant', content: string` | `Message` |
| `getMessages(sessionId)` | `messages` | `sessionId: string` | `Message[]` (ordered by `created_at ASC`) |
| `createFeedback(userId, sessionId, rating, comment?)` | `feedback` | `userId: string, sessionId: string, rating: number, comment?: string` | `Feedback` |

`createMessage` also updates `sessions.updated_at` to `now()` as a side effect.

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Insert duplicate email into `users` | Supabase returns a Postgres unique violation error; `createUser` throws; signup route catches and returns 409 |
| Delete a user | Cascades to all their `sessions` → cascades to all `messages` and `feedback` in those sessions |
| Delete a session | Cascades to all `messages` and `feedback` for that session |
| `NEXT_PUBLIC_SUPABASE_URL` missing | `createClient` is called with `undefined!` → first DB query throws a runtime error |
| Query a non-existent session | `getMessages` returns an empty array (Supabase returns empty data, not an error) |
| Rating outside 1–5 | Postgres CHECK constraint rejects the insert; `createFeedback` throws |
