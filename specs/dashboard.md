# Dashboard Spec — App Shell and Home Screen

## Feature Name
Dashboard Layout — post-login home screen with KPI cards, activity feed, and the 3-panel chat shell.

---

## Description

The app has two distinct dashboard views that share the same auth guard:

1. **`/dashboard`** — Home screen: KPI metric cards + recent activity feed + "New chat" entry point
2. **`/dashboard/chat`** — Chat workspace: 3-panel layout (sidebar / chat area / right panel)

Both views sit behind an auth guard in `app/dashboard/layout.tsx`. If `userId` is not in `localStorage`, the user is redirected to `/login` before any content renders.

---

## Layout

### Home Dashboard (`/dashboard`)
```
┌────────────────────────────────────────────┐
│  Top bar (h-14, border-b)                  │
│  Logo · DocAI          userEmail · Logout  │
├────────────────────────────────────────────┤
│  max-w-6xl mx-auto px-6 py-8              │
│                                            │
│  "Dashboard"              [+ New chat]     │
│  ─────────────────────────────────────     │
│  [ KPI ] [ KPI ] [ KPI ]                  │
│  [ KPI ] [ KPI ] [ KPI ]                  │
│  [ KPI ] [ KPI ] [ KPI ]                  │
│  ─────────────────────────────────────     │
│  Recent activity                           │
│  (chronological event list)                │
└────────────────────────────────────────────┘
```

### Chat Workspace (`/dashboard/chat`)
```
┌──────────────────────────────────────────────────────────┐
│  Sidebar 256px   │  Chat Area flex-1   │  Right 304px    │
│  bg-an-bg-subtle │  bg-an-bg-base      │  bg-an-bg-subtle│
│  border-r        │                     │  border-l       │
└──────────────────────────────────────────────────────────┘
```
Full-screen (`h-screen overflow-hidden`). No outer scroll — each panel scrolls internally.

---

## State Architecture

`app/dashboard/chat/page.tsx` owns all shared chat state:

| State | Type | Why it lives here |
|---|---|---|
| `userId` | `string` | Needed by Sidebar (logout), FeedbackForm (POST) |
| `userEmail` | `string` | Displayed in sidebar footer |
| `sessions` | `Session[]` | Sidebar renders the list; page creates/deletes sessions |
| `activeSessionId` | `string \| null` | ChatArea and sidebar both need it |
| `messages` | `Message[]` | ChatArea renders them; page loads and appends |
| `documentText` | `string` | Sent with every `/api/chat` request |
| `documentFileName` | `string` | Chip label in composer |
| `documentPreview` | `DocumentPreview \| null` | Right panel renders it |
| `isLoading` | `boolean` | Disables composer send button during AI request |
| `steps` | `Step[]` | Right panel execution steps |

Callbacks passed as props to children:
- `onSendMessage(text: string)` — owned by page, called from ChatArea
- `onNewChat()` — creates a session, owned by page, called from Sidebar
- `onSelectSession(id: string)` — loads messages, owned by page, called from Sidebar
- `onSessionsChange(sessions: Session[])` — updates sidebar list, called from Sidebar for mutations
- `onFileLoad(text, fileName, preview)` — owned by page, called from ChatArea on file parse
- `onClearFile()` — owned by page, called from ChatArea on file dismiss

---

## Home / Default View (`/dashboard/page.tsx`)

### KPI Cards

3-column grid, 9 cards. All values start at `0` or `—` and will be wired to real data in a future iteration.

| KPI label | Value source | Notes |
|---|---|---|
| Total documents processed | Count of messages with role=user where content references a file (approx.) | Derived from `messages` table |
| Documents today | Same, filtered to last 24h | — |
| Total AI queries | Count of `messages` where `role='user'` for this user | Across all sessions |
| Queries this week | Same, last 7 days | — |
| Active sessions | Count of `sessions` where `updated_at` > 7 days ago | — |
| Pinned chats | Count of `sessions` where `pinned=true` | — |
| Avg processing time | Average ms from user message to assistant message (requires timestamps) | To be determined |
| AI accuracy (avg rating) | `AVG(rating)` from `feedback` for this user | Formatted to 1 decimal |
| Failed jobs | Count of `sessions` where `status='error'` | — |

Each card uses `components/dashboard/KPICard.tsx`:
- Props: `label: string`, `value: string | number`, `icon: ReactNode`, optional `delta?: { value: string; positive: boolean }`
- Layout: icon top-right, label below icon, value as `text-display`

Loading state: show `—` placeholder while data is fetching.
Error state: show `—` and no delta.

### Recent Activity Feed

**File:** `components/dashboard/ActivityFeed.tsx`

Event types:
| Type | Icon | Label format |
|---|---|---|
| `upload` | `FileText` | `"[filename] uploaded"` |
| `chat` | `Plus` | `"New chat: [session title]"` |
| `query` | `MessageSquare` | `"Asked: [first 60 chars of question]…"` |
| `error` | `AlertCircle` | `"Processing failed for [session title]"` |

- Sorted newest first
- Max 50 events
- Each row: icon (16px, `text-an-fg-muted`) + label (`text-body-sm text-an-fg-subtle`) + relative time (`text-caption text-an-fg-muted`)
- Relative time: "just now", "Xm ago", "Xh ago", "Xd ago"
- Empty state: "No recent activity yet. Start a new chat to get going."

---

## Sidebar (`components/chat/Sidebar.tsx`)

**Width:** 256px fixed, `bg-an-bg-subtle`, `border-r border-an-border`

Elements top to bottom:
1. **Logo area** — `h-14 px-4`, DocAI icon + name, `border-b`
2. **New chat button** — full-width, `bg-an-accent`, `Plus` icon, creates session
3. **Search bar** — `bg-an-bg-surface`, magnifier icon, `×` to clear, client-side filter by `session.title`
4. **Filter chips** — horizontal row: All / Pinned / Recent / Completed / Error
5. **Session list** — scrollable, sessions ordered: pinned first then by `updated_at DESC`
6. **User footer** — pinned to bottom: `userEmail` (truncated) + logout `LogOut` icon button

### Search
- Client-side only: filters `sessions` array in memory
- Searches: `title` field only (case-insensitive)
- Composes with active filter chip
- No results: "No chats found."

### Filter Chips

| Label | Logic |
|---|---|
| All | No filter |
| Pinned | `session.pinned === true` |
| Recent | No additional filter (all unpinned, by date) |
| Completed | `session.status === 'completed'` |
| Error | `session.status === 'error'` |

Default: "All". Active chip: `bg-an-accent-subtle text-an-accent`. Inactive: `bg-an-bg-surface text-an-fg-muted`.

### Session List Item
- Height: 44px, `px-3 rounded`
- States: default (`text-an-fg-subtle bg-transparent`), hover (`bg-an-bg-surface text-an-fg-base`), active (`bg-an-bg-elevated text-an-fg-base`)
- Left: pin icon (11px, shown only when pinned)
- Center: title (`text-body-sm`, truncated 1 line) + created date (`text-caption text-an-fg-muted`)
- Right: status icon (13px) + `···` hover menu button

Status icon mapping:
| `status` | Icon | Color |
|---|---|---|
| `processing` | `Loader2` (spinning) | `text-an-accent` |
| `completed` | `CheckCircle` | `text-an-success` |
| `error` | `AlertCircle` | `text-an-error` |
| `idle` | None | — |

### Context Menu (on hover `···` click)
- Trigger: `···` button visible on hover (`opacity-0 group-hover:opacity-100`)
- Position: absolute, below the button, `bg-an-bg-elevated border border-an-border rounded-md w-36`
- Actions:
  - **Pin / Unpin** — `PATCH /api/sessions/[id]` with `{ pinned: !current }`; update local state
  - **Rename** — switch title to inline `<input>`, confirm on Enter, cancel on Escape; `PATCH /api/sessions/[id]` with `{ title }`
  - **Delete** — open `ConfirmDialog`; on confirm: `DELETE /api/sessions/[id]`; remove from local state
- Closes: on outside click or after action

### User Footer
- Shows: `userEmail` (truncated, `text-body-sm text-an-fg-subtle`)
- Logout action: clear `localStorage.userId` and `localStorage.userEmail`, redirect to `/login`

---

## Right Panel (`components/chat/RightPanel.tsx`)

**Width:** 304px fixed, `bg-an-bg-subtle`, `border-l border-an-border`

### Execution Steps Section
- Header: "Execution steps" (`text-body-sm font-medium`)
- Empty state: "Waiting for activity…" (`text-caption text-an-fg-muted`)
- Each step: icon (13px) + label (`text-body-sm`)

| Status | Icon | Label color |
|---|---|---|
| `running` | `Loader2` spinning | `text-an-fg-base` |
| `completed` | `CheckCircle` | `text-an-fg-subtle` |
| `error` | `AlertCircle` | `text-an-error` |

Steps during a send cycle (in order):
1. "Document parsed" — completed (shown when file loaded)
2. "Sending to AI…" — running → completed
3. "Waiting for response…" — running → completed
4. "Response received" — completed
5. "Error — could not reach AI" — error (if `/api/chat` returns non-200)

Reset to `[]` when a new chat session is started.

### Document Preview Section
Shown only when a file is loaded. Contains filename label + preview content.

**PDF:** `<iframe src={blobUrl} className="w-full h-56 rounded border border-an-border" />`
**DOCX:** `<pre>` with extracted text, truncated at 4,000 chars, `font-mono text-[12px] text-an-fg-subtle overflow-y-auto max-h-56 whitespace-pre-wrap`

---

## API Routes

### `GET /api/sessions?userId=`
Returns all sessions for a user, ordered by `updated_at DESC`.

### `POST /api/sessions`
Body: `{ userId, title? }`  
Creates a session with `status='idle'`, `pinned=false`. Returns the new `Session` object.

### `PATCH /api/sessions/[id]`
Body: any subset of `{ title, status, pinned, updated_at }`  
Used for rename, pin/unpin, and status updates.

### `DELETE /api/sessions/[id]`
Deletes session; Postgres cascades to `messages` and `feedback`. Returns `{ ok: true }`.

### `GET /api/sessions/[id]/messages`
Returns all messages for the session, ordered by `created_at ASC`.

---

## Components

| Component | File | Responsibility |
|---|---|---|
| `DashboardPage` | `app/dashboard/page.tsx` | KPI grid, activity feed, new chat button |
| `KPICard` | `components/dashboard/KPICard.tsx` | Single metric card: label / value / icon / delta |
| `ActivityFeed` | `components/dashboard/ActivityFeed.tsx` | Chronological event list |
| `ChatPage` | `app/dashboard/chat/page.tsx` | All shared state, session management, message sending |
| `Sidebar` | `components/chat/Sidebar.tsx` | Session list, search, filters, context menu, user footer |
| `RightPanel` | `components/chat/RightPanel.tsx` | Execution steps, document preview |
| `ConfirmDialog` | `components/shared/ConfirmDialog.tsx` | Reusable delete confirmation modal |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| No sessions exist | Sidebar shows "No chats found." empty state |
| User deletes the active session | Active session state clears, ChatArea shows empty state |
| Filter + search produce no results | "No chats found." shown in session list |
| Rename submitted with empty string | Validated client-side — do not call API |
| User clicks "New chat" with an existing empty session | Still creates a new session (no deduplication in MVP) |
| Rapid session switching while messages are loading | Clear `messages` immediately on selection to avoid stale flash |
| KPI data fetch fails | Show `—` for that card; do not crash the page |
