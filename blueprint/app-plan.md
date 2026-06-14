# Legal Contract Review App — Build Plan

## Context

Building a document-analysis chat app using Azure AI Agents. Users upload PDF/DOCX contracts, ask questions in a chat interface, and get AI-grounded answers with source citations. Sessions and feedback are persisted in Supabase. The project scaffold (Next.js 14 + Tailwind + all routes and components) already exists and the dev server is running. What remains is wiring up real data: Supabase tables, credentials, and the Azure OAuth + chat flow.

**PRD:** `PRD.md`  
**Design system:** `.claude/knowledge/design-system.md`  
**Azure integration spec:** `.claude/knowledge/azure-endpoint.md`

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | API routes + React server/client in one repo |
| Styling | Tailwind CSS + CSS variables | Design system already defined with `an-*` tokens |
| Database | Supabase (PostgreSQL) | JS SDK, easy setup, RLS support |
| Auth | Custom `users` table + bcryptjs | No Supabase Auth — full control per rules.md |
| AI | Azure AI Agents REST API (`2025-05-01`) | Via OAuth Bearer token, never from client |
| File parsing | pdfjs-dist (PDF) + mammoth (DOCX) | Client-side, files never uploaded to server |
| Icons | Lucide React | Stroke-only, 1.5px, consistent with Claude UI |

---

## Phase 1 — Supabase Database Setup

**Action:** Run the following SQL in the Supabase dashboard (SQL editor) before any other step.

```sql
-- Users (custom auth, no Supabase Auth)
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Sessions (one per chat)
CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
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
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback (one per assistant message)
CREATE TABLE feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX ON sessions(user_id, updated_at DESC);
CREATE INDEX ON messages(session_id, created_at ASC);
CREATE INDEX ON feedback(session_id);
```

**RLS:** Disable RLS for MVP (the app uses the anon key server-side only). Enable per-user RLS before public launch.

---

## Phase 2 — Environment Variables

Copy `.env.local.example` → `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key

AZURE_CLIENT_ID=                 # Azure App Registration client ID
AZURE_CLIENT_SECRET=             # Azure App Registration secret
AZURE_TENANT_ID=                 # Azure tenant ID
AZURE_AGENT_ENDPOINT_URL=        # https://<name>.services.ai.azure.com/api/projects/<project>
AZURE_AGENT_ID=                  # asst_xxx from Azure AI Foundry

NEXTAUTH_URL=http://localhost:PORT
```

---

## Phase 3 — Auth (already scaffolded, needs Supabase live)

**Files already created:**
- `app/signup/page.tsx` — email + password form, POST `/api/auth/signup`
- `app/login/page.tsx` — email + password form, POST `/api/auth/login`
- `app/api/auth/signup/route.ts` — checks email uniqueness, bcrypt hash, insert user
- `app/api/auth/login/route.ts` — query user, compare hash, return userId
- `app/dashboard/layout.tsx` — auth guard (redirects to /login if no userId in localStorage)

**Success flow:**  
Signup/login → store `userId` + `userEmail` in localStorage → redirect to `/dashboard`

**Error display:**
- Signup: "An account with this email already exists."
- Login: "Invalid email or password." (never reveal which field is wrong)

**UI spec:** Light mode (`data-theme="light"`), centered card 400px max-width, coral accent button, Inter font.

---

## Phase 4 — Landing Page (already scaffolded)

**File:** `app/page.tsx`

On load: check `localStorage.userId` → redirect to `/dashboard` if logged in.

Sections (all already written):
1. Navbar — logo + "Sign in" link + "Get started" CTA
2. Hero — serif headline, two CTAs
3. How it works — 3 steps
4. Features — 4 cards (MessageSquare, Zap, Shield, BarChart3)
5. Pricing — 4 tiers (Free / Starter / Growth / Pro)
6. Footer — copyright + policy links

Design tokens in use: `bg-an-bg-base`, `text-an-fg-base`, `an-accent`, `an-border`, `font-serif` (Lora).

---

## Phase 5 — Dashboard (already scaffolded, connect to Supabase)

**File:** `app/dashboard/page.tsx`

KPI grid (3 columns, 9 cards):
- Total documents processed, Documents today, Total AI queries, Queries this week, Active sessions, Pinned chats, Avg processing time, AI accuracy (avg rating), Failed jobs
- Each uses `components/dashboard/KPICard.tsx` — label / value / optional delta / icon

Activity feed: `components/dashboard/ActivityFeed.tsx`
- Initially empty state ("No recent activity yet…")
- Future: query sessions + messages joined by `user_id`

"New chat" button → navigates to `/dashboard/chat` and creates a session via POST `/api/sessions`.

---

## Phase 6 — Chat Interface (3-panel shell, connect to Supabase)

**Shell file:** `app/dashboard/chat/page.tsx` — holds all shared state

### Layout (fixed heights, no scroll on outer shell)
```
h-screen flex overflow-hidden
├── Sidebar          w-64 shrink-0  bg-an-bg-subtle  border-r
├── ChatArea         flex-1 min-w-0  bg-an-bg-base
└── RightPanel       w-[304px] shrink-0  bg-an-bg-subtle  border-l
```

### Sidebar (`components/chat/Sidebar.tsx`) — already written
- New chat button (coral accent, full width)
- Search bar (client-side filter on session title)
- Filter chips: All / Pinned / Recent / Completed / Error
- Session list items (44px, title truncated, created timestamp, status icon)
- Context menu on hover: Pin/Unpin, Rename (inline edit), Delete (confirmation dialog)
- User email + logout at bottom

### ChatArea (`components/chat/ChatArea.tsx`) — already written
- Empty state when no session selected
- MessageList (scrollable, auto-scroll to bottom)
- Composer pinned to bottom (max-width 680px, centered)
  - Paperclip → hidden `<input type="file" accept=".pdf,.docx">`
  - Textarea (auto-resize 1–5 rows, Enter to send, Shift+Enter for newline)
  - Send button (coral circle, disabled when empty or loading)
  - Filename chip above textarea when file loaded (name + × to dismiss)

### RightPanel (`components/chat/RightPanel.tsx`) — already written
- Execution steps section (5 states: parsing / sending / waiting / completed / error)
- Document preview section (PDF iframe or DOCX text `<pre>`)

---

## Phase 7 — File Parsing (`lib/parse-file.ts`)

Already implemented. Called client-side in `ChatArea` on file selection:

```
parseFile(file)
  ├── PDF  → pdfjs-dist (worker via unpkg CDN)
  │          throws if text is empty (scanned PDF)
  └── DOCX → mammoth.extractRawText()
```

Result stored in `documentText` state (component only, never persisted).

---

## Phase 8 — Azure AI Integration

### OAuth setup (one-time)
1. Azure Portal → App Registration → add redirect URI: `http://localhost:PORT/api/auth/microsoft/callback`
2. Add permission: Azure Machine Learning → `user_impersonation` → grant admin consent
3. Create client secret → copy to `.env.local`

### Routes (already written)
- `GET /api/auth/microsoft` — generates Microsoft login URL via `@azure/msal-node`, redirects user
- `GET /api/auth/microsoft/callback` — receives `code`, exchanges for token, stores in HTTP-only cookie `azure_token`, redirects to `/dashboard`
- `POST /api/chat` — reads `azure_token` cookie, creates thread, adds message (contract text + question), runs agent, polls until `completed`, returns assistant message

### Chat flow
1. User types message + (optionally) has file loaded
2. `ChatArea` calls `onSendMessage(text)`
3. `page.tsx` adds optimistic user bubble, calls `POST /api/messages` (save user msg), then `POST /api/chat`
4. While waiting: right panel shows "Sending to AI… / Waiting for response…" steps
5. On response: saves assistant message, shows bubble + feedback form
6. On error: shows "Error — could not reach AI" step in right panel

### Azure API sequence (inside `/api/chat/route.ts`)
```
POST {endpoint}/threads                    → threadId
POST {endpoint}/threads/{threadId}/messages → (contract + question)
POST {endpoint}/threads/{threadId}/runs    → runId
POLL {endpoint}/threads/{threadId}/runs/{runId} every 1.5s (max 60s)
GET  {endpoint}/threads/{threadId}/messages → extract assistant reply
```

All requests use `Authorization: Bearer {azure_token}` and `api-version=2025-05-01`.

---

## Phase 9 — Session Management

All CRUD routes already exist:
- `POST /api/sessions` — create
- `GET /api/sessions?userId=` — list (ordered by `updated_at DESC`)
- `PATCH /api/sessions/[id]` — rename title or toggle pinned
- `DELETE /api/sessions/[id]` — cascade-deletes messages + feedback
- `GET /api/sessions/[id]/messages` — load messages for a session

Session title auto-update: after first user message, if title is still "New session", update to first 55 chars of message + "…" via `PATCH /api/sessions/[id]`.

---

## Phase 10 — Feedback System

After every assistant `MessageBubble`, a `FeedbackForm` is rendered:
- 5-star rating (required), hover preview
- Optional comment (max 200 chars with counter)
- Submit → `POST /api/feedback` → saved to Supabase `feedback` table
- On success: replaced by "Thanks for your feedback."
- On error: inline error, form stays open for retry

Each form is independent, keyed by `message.id`.

---

## Phase 11 — "Connect with Microsoft" button (Dashboard)

Add a banner/button at the top of the dashboard or chat:

```tsx
<a href="/api/auth/microsoft" className="...">
  Connect with Microsoft to enable AI chat
</a>
```

Show only when `azure_token` cookie is absent. Hide after OAuth completes.  
Without this token, `/api/chat` returns 401 and the chat shows an error step.

---

## Critical Files

| File | Status | Action |
|---|---|---|
| `app/page.tsx` | ✅ Done | — |
| `app/signup/page.tsx` | ✅ Done | Test after Supabase live |
| `app/login/page.tsx` | ✅ Done | Test after Supabase live |
| `app/dashboard/page.tsx` | ✅ Done | Wire KPIs to real data |
| `app/dashboard/chat/page.tsx` | ✅ Done | Verify session + message flow |
| `app/api/auth/signup/route.ts` | ✅ Done | — |
| `app/api/auth/login/route.ts` | ✅ Done | — |
| `app/api/auth/microsoft/route.ts` | ✅ Done | Test after Azure creds |
| `app/api/auth/microsoft/callback/route.ts` | ✅ Done | Test after Azure creds |
| `app/api/chat/route.ts` | ✅ Done | Test after azure_token cookie |
| `app/api/sessions/route.ts` | ✅ Done | — |
| `app/api/sessions/[id]/route.ts` | ✅ Done | — |
| `app/api/sessions/[id]/messages/route.ts` | ✅ Done | — |
| `app/api/messages/route.ts` | ✅ Done | — |
| `app/api/feedback/route.ts` | ✅ Done | — |
| `components/chat/Sidebar.tsx` | ✅ Done | — |
| `components/chat/ChatArea.tsx` | ✅ Done | — |
| `components/chat/MessageList.tsx` | ✅ Done | — |
| `components/chat/MessageBubble.tsx` | ✅ Done | — |
| `components/chat/FeedbackForm.tsx` | ✅ Done | — |
| `components/chat/RightPanel.tsx` | ✅ Done | — |
| `components/dashboard/KPICard.tsx` | ✅ Done | — |
| `components/dashboard/ActivityFeed.tsx` | ✅ Done | Wire to real data |
| `components/shared/ConfirmDialog.tsx` | ✅ Done | — |
| `lib/supabase.ts` | ✅ Done | Needs env vars |
| `lib/db.ts` | ✅ Done | — |
| `lib/parse-file.ts` | ✅ Done | — |
| `.env.local` | ❌ Missing | User must create from example |
| Supabase SQL tables | ❌ Missing | Run Phase 1 SQL |
| Azure App Registration | ❌ Missing | One-time setup |

---

## Verification

### Step 1 — Supabase
1. Run Phase 1 SQL in Supabase SQL editor
2. Confirm 4 tables appear in Table Editor

### Step 2 — Auth
1. Fill `.env.local` with Supabase URL + anon key
2. Restart dev server
3. Go to `http://localhost:PORT/signup` → create account
4. Check `users` table in Supabase — row should appear with bcrypt hash
5. Log out → go to `/login` → sign in with same credentials
6. Confirm redirect to `/dashboard`

### Step 3 — Session + Chat (without Azure)
1. From dashboard, click "New chat"
2. Confirm new session created in Supabase `sessions` table
3. Confirm sidebar shows session
4. Upload a PDF → confirm parsing works (filename chip appears)
5. Type a message → confirm it's saved in `messages` table
6. Expect 401 error step in right panel (Azure not connected yet — expected)

### Step 4 — Azure AI
1. Fill Azure env vars in `.env.local`
2. Click "Connect with Microsoft" → complete OAuth flow
3. Confirm `azure_token` cookie set in browser DevTools
4. Send a question about the uploaded document
5. Confirm right panel shows execution steps progressing
6. Confirm assistant response appears in chat
7. Submit 5-star feedback → confirm row in `feedback` table

### Step 5 — Session management
1. Rename a session via right-click context menu
2. Pin a session — confirm it moves to "Pinned" section
3. Delete a session — confirm dialog appears and row is removed from Supabase

---

## Output

After approval, also save this plan as:  
`/Users/nikolaosvoutos/Documents/GitHub/ai-community-site/week-5-claudeapp/blueprint/app-plan.md`
