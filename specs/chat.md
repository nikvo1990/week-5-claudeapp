# Chat Spec — Chat Interface and Session Management

## Feature Name
Chat Interface — document-grounded AI conversation with session management, message history, and auto-title generation.

---

## Description

The chat interface is the core workspace of the app. Users:
1. Select or create a session from the sidebar
2. Optionally upload a PDF or DOCX contract
3. Type questions in the composer
4. Receive AI responses (grounded in the uploaded document)
5. Rate each response via a feedback form

Responses are returned whole (no streaming in v1.0). Conversation history is persisted in Supabase and fully reloaded when a session is selected. The document text is NOT persisted — users must re-attach if they reopen a past session.

---

## User Flow

1. **New session:** User clicks "New chat" in sidebar → `POST /api/sessions` creates a session → sidebar refreshes → session becomes active → chat area shows empty state
2. **File attachment (optional):** User clicks paperclip → file picker opens → on selection, file is parsed client-side → filename chip appears above composer → document text stored in state
3. **Send message:** User types question → press Enter (or click send button) → optimistic user bubble appears immediately → `POST /api/messages` saves the user message → `POST /api/chat` sends to Azure AI
4. **Loading state:** Composer is disabled, send button disabled, right panel execution steps update
5. **Response arrives:** Assistant bubble appears → `POST /api/messages` saves assistant message → feedback form appears below bubble
6. **Reopen session:** User clicks a past session in sidebar → messages clear immediately → `GET /api/sessions/[id]/messages` loads history → all bubbles render → user can continue (document must be re-attached)

---

## Shared Context State — CRITICAL

State is owned by `app/dashboard/chat/page.tsx` and passed as props:

| State | Type | Which components need it |
|---|---|---|
| `activeSessionId` | `string \| null` | Sidebar (active highlight), ChatArea (enable composer), RightPanel (step reset) |
| `messages` | `Message[]` | ChatArea → MessageList → MessageBubble |
| `documentText` | `string` | Sent with every `/api/chat` POST — never shown in UI directly |
| `documentFileName` | `string` | Filename chip in composer |
| `documentPreview` | `DocumentPreview \| null` | Right panel preview |
| `isLoading` | `boolean` | Composer disabled state, send button state |
| `steps` | `Step[]` | Right panel execution steps |

`documentText` must live in the page, not in ChatArea — it is sent to the server route which the ChatArea doesn't directly call.

When a new session is started: `steps`, `documentText`, `documentFileName`, `documentPreview` all reset to empty/null.  
When a different session is selected: `messages` clears immediately (before fetch) to avoid stale flash.

---

## Message Rendering

### User messages
- Alignment: right (`flex flex-col items-end`)
- Max width: 75% of the 680px container
- Background: `bg-an-accent-subtle`
- Border: `1px solid rgba(217,119,87,0.20)`
- Border-radius: `12px 12px 4px 12px` (sharp bottom-right corner)
- Padding: `px-4 py-3`
- Font: `text-body text-an-fg-base`
- Timestamp: below bubble, right-aligned, `text-caption text-an-fg-muted`

### Assistant messages
- Alignment: left
- No bubble background — text directly on `bg-an-bg-base`
- Prefix: `8px coral dot` (`w-2 h-2 bg-an-accent rounded-full mt-1.5 shrink-0`)
- Text: `text-body text-an-fg-base leading-relaxed whitespace-pre-wrap`
- Timestamp: below text, left-aligned with 20px indent, `text-caption text-an-fg-muted`
- Feedback form: immediately below timestamp

### Message Timestamps
- Format: `HH:MM` (24-hour) if the message is from today
- Format: `DD Mon HH:MM` if the message is from a previous day
- Placement: below the bubble, small indent

---

## Streaming Responses
Not implemented in v1.0. The full response is returned as a single JSON payload from `POST /api/chat`. A loading spinner appears in the message list while the request is in flight. Streaming (SSE) is planned for v1.1.

---

## Conversation History

- **Persistence:** Every user and assistant message is saved to the `messages` table via `POST /api/messages` immediately after it is generated
- **Auto-save for user messages:** `POST /api/messages` is called before `POST /api/chat` — so the user's message is saved even if the AI call fails
- **Reopen behavior:** On session select, `GET /api/sessions/[id]/messages` returns all messages ordered by `created_at ASC`; they are rendered as MessageBubble components
- **Error loading history:** Show inline error message "Failed to load messages. Please try again." — no silent failure

---

## Infinite Scroll / Pagination
Not implemented in v1.0. All messages for a session are fetched in a single request. Pagination (25 messages at a time, scroll-up to load more) is planned for v1.1.

---

## Message Bubble Styling

| Property | User | Assistant |
|---|---|---|
| Alignment | Right | Left |
| Background | `bg-an-accent-subtle` | None |
| Border | `1px solid rgba(217,119,87,0.20)` | None |
| Border-radius | `12px 12px 4px 12px` | — |
| Max-width | 75% of container | Full 680px |
| Padding | `px-4 py-3` | — |
| Prefix | None | 8px coral dot (`w-2 h-2`) |

---

## Components

| Component | Responsibility | Key props |
|---|---|---|
| `ChatArea` | Composer, file attach, MessageList wrapper | `messages`, `isLoading`, `documentFileName`, `onSendMessage`, `onFileLoad`, `onClearFile` |
| `MessageList` | Scrollable message container, auto-scroll to bottom | `messages`, `isLoading`, `userId`, `sessionId` |
| `MessageBubble` | Single message — user or assistant bubble | `message: Message`, `userId`, `sessionId` |
| `FeedbackForm` | Star rating + comment, appears below every assistant bubble | `messageId`, `userId`, `sessionId` |

`ChatArea` owns no state. `MessageList` owns a `bottomRef` for auto-scroll. All other state is in the page.

---

## Optimistic Updates

- **User message:** Added to `messages` state immediately with a `crypto.randomUUID()` ID before any API call
- **No rollback in v1.0:** If the AI call fails, the optimistic message stays in the UI and the error step appears in the right panel; the user message is already saved to DB
- **Assistant message:** Added to `messages` state when the `/api/chat` response arrives — not optimistic

---

## API Routes

### `POST /api/messages`
**File:** `app/api/messages/route.ts`

Request body:
```json
{ "sessionId": "uuid", "role": "user|assistant", "content": "string" }
```

Response (201): the saved `Message` object  
Error (400): `{ "error": "sessionId, role, and content are required." }`

### `GET /api/sessions/[id]/messages`
**File:** `app/api/sessions/[id]/messages/route.ts`

Returns all messages for the session, ordered by `created_at ASC`.

Response (200): `Message[]`

---

## History Loading

- **Clear immediately on session select:** `setMessages([])` before calling the API — prevents stale message flash
- **Loading state:** No skeleton in v1.0 — empty state is shown briefly while loading
- **On error:** Inline message "Failed to load messages." — never swallow silently

---

## Auto-Generated Titles

- **Trigger:** After the first user message is sent, if `session.title === 'New session'`
- **Derived from:** First 55 characters of the user message + `"…"` if longer
- **Guard:** Only rename if title is still `'New session'` — never overwrite a manual rename
- **How persisted:** `PATCH /api/sessions/[id]` with `{ title: newTitle }`
- **UI update:** `onSessionsChange` updates sidebar list optimistically in local state

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| User switches session while AI response is in flight | No cancellation in v1.0 — response saves to the original session; switching does not abort the fetch |
| No document attached | `contractText` sent as empty string to `/api/chat`; AI answers from its general knowledge (per system prompt) |
| Send fails (network error) | Error step appears in right panel; optimistic user message remains; user can retry by sending again |
| Empty or whitespace-only message | Send button disabled; Enter key does nothing |
| Very long assistant response | Rendered in full; `MessageList` scrolls down automatically |
| Session has no messages | ChatArea shows the composer only (ready to type — no empty-state message inside the chat area) |
| Feedback form for an assistant message that's mid-scroll | Each form is independent, keyed by `message.id` |
