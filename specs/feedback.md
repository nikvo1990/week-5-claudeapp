# Feedback Spec — Response Rating System

## Feature Name
Response Feedback — 5-star rating with optional comment, shown after every AI assistant message.

---

## Description

After every assistant response in the chat, a feedback form appears inline below the message bubble. Users can rate the response from 1 to 5 stars and optionally add a short comment. The rating is saved to the `feedback` table in Supabase, linked to the user and session. Each form is independent — keyed by `message.id` so ratings for different messages don't interfere.

---

## User Flow

1. Assistant message appears in the chat
2. `FeedbackForm` renders immediately below the assistant bubble and timestamp
3. User hovers over stars — each star previews the rating (fill up to hovered star)
4. User clicks a star — rating is locked at that value
5. Once a star is selected, a textarea and submit button appear
6. User optionally types a comment (max 200 chars; character counter shown in real time)
7. User clicks "Submit"
8. `POST /api/feedback` is called with `{ userId, sessionId, rating, comment? }`
9. On success: form is replaced by "Thanks for your feedback." (`text-caption text-an-fg-muted`)
10. On error: inline error shown below the form; form stays open for retry

The user can skip feedback entirely — no action required. There is no dismiss button; the form stays visible until submitted or until the page is closed.

---

## Placement

- **Position:** Inline, directly below each assistant `MessageBubble`
- **Indent:** 20px left (matching the coral dot prefix alignment: `ml-5`)
- **Width:** Max 400px for the comment textarea
- **No floating overlay or modal** — fully inline in the message list
- **Z-index:** Normal document flow (no z-index needed)

---

## DB Schema

Table: `feedback`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `user_id` | UUID | NOT NULL, FK → `users(id)` ON DELETE CASCADE |
| `session_id` | UUID | NOT NULL, FK → `sessions(id)` ON DELETE CASCADE |
| `rating` | INTEGER | NOT NULL, CHECK `BETWEEN 1 AND 5` |
| `comment` | TEXT | NULLABLE |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

No unique constraint per message in v1.0 — multiple ratings for the same session are allowed. A unique index per (user_id, message_id) is planned for v1.1 when message-level feedback is enforced.

Index: `CREATE INDEX ON feedback(session_id);` — used when calculating avg rating per session for KPI cards.

---

## DB Tasks — What to Create

Run in Supabase SQL editor (included in the main schema SQL in `database.md`):

```sql
CREATE TABLE feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON feedback(session_id);
```

---

## DB Helper Functions

**File:** `lib/db.ts`

### `createFeedback(userId, sessionId, rating, comment?)`
- Inserts a row into `feedback`
- Parameters: `userId: string`, `sessionId: string`, `rating: number`, `comment?: string`
- Sets `comment` to `null` if not provided
- Returns: the new `Feedback` row
- Throws on DB error

No `getFeedback` function needed in v1.0 — ratings are submitted once and not re-fetched.

---

## API Routes

### `POST /api/feedback`
**File:** `app/api/feedback/route.ts`

Request body:
```json
{ "userId": "uuid", "sessionId": "uuid", "rating": 1-5, "comment": "string (optional)" }
```

| Status | Condition | Response |
|---|---|---|
| 201 | Success | New `Feedback` object |
| 400 | `userId`, `sessionId`, or `rating` missing | `{ "error": "userId, sessionId, and rating are required." }` |
| 500 | DB error | `{ "error": "..." }` |

---

## State Management

State is owned entirely by the `FeedbackForm` component — the parent (`MessageBubble`) does not manage feedback state.

| State | Type | Description |
|---|---|---|
| `rating` | `number` (0–5) | 0 = no rating selected |
| `hovered` | `number` (0–5) | 0 = no hover |
| `comment` | `string` | User's optional text |
| `submitted` | `boolean` | True after successful save |
| `error` | `string` | Error message string or `""` |
| `loading` | `boolean` | True while POST is in flight |

- Submit button is disabled when `rating === 0` or `loading === true`
- Comment textarea and submit button appear only when `rating > 0`
- When `submitted === true`, the whole form is replaced by a confirmation message

---

## Component

**File:** `components/chat/FeedbackForm.tsx`

Props:
| Prop | Type | Purpose |
|---|---|---|
| `messageId` | `string` | Used as React key — ensures independence between forms |
| `userId` | `string` | Included in the POST body |
| `sessionId` | `string` | Included in the POST body |

Behavior:
- Stars are rendered with `lucide-react` `Star` icon (14px, strokeWidth 1.5)
- Active star: `text-an-accent fill-an-accent`; inactive: `text-an-fg-muted`
- Submit button: `h-7 px-3 bg-an-accent hover:bg-an-accent-hover text-white text-label rounded`; disabled opacity 50%
- On success: `<p className="text-caption text-an-fg-muted">Thanks for your feedback.</p>` replaces the form
- The parent does NOT receive a callback — feedback is fully self-contained

---

## Design

- **Star row:** 5 stars, 14px, `p-0.5` padding per star for a comfortable click target
- **Hover state:** Fill stars up to hovered position with `text-an-accent fill-an-accent`
- **Selected state:** Same as hover; locked on click
- **Textarea:** `bg-an-bg-surface border border-an-border rounded px-3 py-2 text-body-sm text-an-fg-base placeholder:text-an-fg-muted`, max-width 400px, 2 rows, resize: none
- **Character counter:** `text-caption text-an-fg-muted absolute bottom-2 right-3` inside textarea container
- **Submit button:** `self-start h-7 px-3 bg-an-accent hover:bg-an-accent-hover text-white text-label rounded`
- **Error message:** `text-caption text-an-error` above the submit button
- **Confirmation:** `text-caption text-an-fg-muted` — "Thanks for your feedback."

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| User dismisses without submitting | Form stays visible (no dismiss action available); no data saved |
| User submits with no comment | `comment` is omitted from the POST body; `null` stored in DB |
| Submit fails (network error) | Inline error shown: "Could not save feedback. Please try again."; form stays open |
| User tries to submit twice | After first success, form is replaced by confirmation — no second submit possible |
| Session changes while form is open | Form remains rendered until the component unmounts (session switch clears `messages` state, which unmounts all `MessageBubble` components) |
| Comment exceeds 200 chars | `onChange` slices input to 200 chars — user cannot type beyond the limit |
| Rating 0 submitted programmatically | Prevented by disabled submit button; also rejected by server (400) |
