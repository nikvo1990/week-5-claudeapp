# Azure Integration Spec — AI Agent Chat and OAuth

## Feature Name
Azure AI Integration — OAuth 2.0 authentication with Microsoft and document-grounded chat via Azure AI Agents REST API.

---

## Description

The app connects to an Azure AI Agent hosted in Azure AI Foundry. All AI calls are made server-side via Next.js API routes — never from the browser. The Azure AI Agent requires an Azure AD Bearer token (not an API key). Users authenticate with Microsoft OAuth to obtain this token, which is stored in an HTTP-only cookie.

**API version used:** `2025-05-01` (the only version that works — do not change)  
**Package:** `@azure/msal-node` (OAuth token exchange — do not use `@azure/openai`)  
**Transport:** Azure AI Foundry Agents REST API (thread-based, not OpenAI chat completions)

---

## User Flow

### First-time connection
1. User sees "Connect with Microsoft" banner/button on dashboard or chat page
2. User clicks → browser navigates to `/api/auth/microsoft`
3. Server generates Microsoft login URL via `ConfidentialClientApplication.getAuthCodeUrl()`
4. Browser redirects to Microsoft login
5. User signs in and consents to `user_impersonation` scope
6. Microsoft redirects to `/api/auth/microsoft/callback?code=...`
7. Server exchanges code for access token via `acquireTokenByCode()`
8. Server stores access token in HTTP-only cookie `azure_token` (max-age: 3600s)
9. Browser redirects to `/dashboard`
10. "Connect with Microsoft" banner disappears (cookie is now present)

### Every AI chat request
1. `POST /api/chat` reads `azure_token` cookie from the request
2. If cookie missing → return 401 → right panel shows "Error — not connected"
3. Creates a thread, adds a message (document text + question), runs the agent, polls until complete, returns the reply

### Token expiry
- Token expires after ~1 hour
- In v1.0: when `/api/chat` returns 401, the chat shows an error step; user must click "Connect with Microsoft" again
- Silent refresh (`acquireTokenSilent`) is planned for v1.1

---

## OAuth Setup (One-Time, Azure Portal)

1. Go to Azure Portal → Azure Active Directory → App registrations → New registration
2. Set redirect URIs:
   - `http://localhost:PORT/api/auth/microsoft/callback` (development)
   - `https://yourdomain.com/api/auth/microsoft/callback` (production)
3. Add API permission: Azure Machine Learning → Delegated → `user_impersonation`
4. Grant admin consent for the permission
5. Go to Certificates & secrets → New client secret → copy the value
6. Copy: Application (client) ID, Directory (tenant) ID, client secret value → paste into `.env.local`

---

## Environment Variables

| Variable | Where to find it | Description |
|---|---|---|
| `AZURE_CLIENT_ID` | App registrations → your app → Application (client) ID | OAuth app identity |
| `AZURE_CLIENT_SECRET` | App registrations → your app → Certificates & secrets → secret value | OAuth client secret |
| `AZURE_TENANT_ID` | App registrations → your app → Directory (tenant) ID | Azure AD tenant |
| `AZURE_AGENT_ENDPOINT_URL` | AI Foundry → your project → Overview → endpoint URL | Format: `https://<name>.services.ai.azure.com/api/projects/<project>` |
| `AZURE_AGENT_ID` | AI Foundry → your project → Agents → click agent → copy `asst_xxx` ID | Must be `asst_xxx` format — not the display name |
| `NEXTAUTH_URL` | Set manually | `http://localhost:PORT` for dev; production URL for prod |

---

## API Routes

### `GET /api/auth/microsoft`
**File:** `app/api/auth/microsoft/route.ts`

- Creates `ConfidentialClientApplication` with client ID, secret, and tenant authority
- Calls `getAuthCodeUrl({ scopes: ['https://ml.azure.com/user_impersonation', 'offline_access'], redirectUri })`
- Redirects the browser to the resulting Microsoft login URL

### `GET /api/auth/microsoft/callback`
**File:** `app/api/auth/microsoft/callback/route.ts`

- Reads `code` from query string
- Calls `acquireTokenByCode({ code, scopes, redirectUri })`
- Sets HTTP-only cookie `azure_token = result.accessToken` (max-age: 3600, httpOnly: true, secure: true in production)
- Redirects to `/dashboard`
- On failure: redirects to `/login?error=oauth_failed`

### `POST /api/chat`
**File:** `app/api/chat/route.ts`

**Request body:**
```json
{
  "contractText": "string (may be empty if no file attached)",
  "userMessage": "string",
  "sessionId": "uuid"
}
```

**Azure API call sequence:**

```
1. Read azure_token from HTTP-only cookie
   └── Missing → 401 { error: "Not connected to Azure. Please reconnect." }

2. POST {AZURE_AGENT_ENDPOINT_URL}/threads?api-version=2025-05-01
   Headers: Authorization: Bearer {token}, Content-Type: application/json
   Body: {}
   → { id: threadId }

3. POST {AZURE_AGENT_ENDPOINT_URL}/threads/{threadId}/messages?api-version=2025-05-01
   Body: {
     role: "user",
     content: contractText
       ? `Document content:\n\n${contractText}\n\n---\n\nUser question: ${userMessage}`
       : userMessage
   }

4. POST {AZURE_AGENT_ENDPOINT_URL}/threads/{threadId}/runs?api-version=2025-05-01
   Body: { assistant_id: AZURE_AGENT_ID }
   → { id: runId }

5. POLL {AZURE_AGENT_ENDPOINT_URL}/threads/{threadId}/runs/{runId}?api-version=2025-05-01
   Interval: every 1,500ms
   Timeout: 60 seconds
   Terminal states: "completed" or "failed"

6. If timeout or "failed" → 504 { error: "AI did not respond in time." }

7. GET {AZURE_AGENT_ENDPOINT_URL}/threads/{threadId}/messages?api-version=2025-05-01
   → Extract: msgs.data.find(m => m.role === 'assistant')?.content[0]?.text?.value
   → { reply: string }
```

**Response (200):**
```json
{ "reply": "string" }
```

**Error responses:**

| Status | Condition | Response |
|---|---|---|
| 401 | `azure_token` cookie missing | `{ error: "Not connected to Azure. Please reconnect." }` |
| 400 | `userMessage` missing | `{ error: "Message is required." }` |
| 500 | `AZURE_AGENT_ENDPOINT_URL` or `AZURE_AGENT_ID` not set | `{ error: "Azure agent not configured." }` |
| 502 | Thread creation or message add failed | `{ error: "Failed to create AI thread." }` |
| 504 | Polling timed out or status is "failed" | `{ error: "AI did not respond in time. Please try again." }` |
| 500 | Unexpected exception | `{ error: "Unexpected error. Please try again." }` |

---

## "Connect with Microsoft" Banner

**Shown:** When the `azure_token` cookie is absent.  
**Hidden:** After OAuth completes (cookie set).

Implementation: Check for cookie client-side is not possible (HTTP-only). Instead:
- Detect 401 from `/api/chat` as the signal that the token is missing
- Show a persistent banner/button at the top of the chat page linking to `/api/auth/microsoft`

In v1.1: Check cookie presence via a lightweight `GET /api/auth/status` route that returns `{ connected: boolean }`.

---

## System Prompt

Sent as part of the agent's configuration in Azure AI Foundry (not per-request in v1.0):

> You are an AI assistant. Answer questions based solely on the document text provided. Always cite the specific section or part you are referencing. If the answer cannot be found in the provided text, say: "I cannot find this in the document." Do not speculate beyond what the document contains.

---

## Error Diagnosis Reference

| Error | Cause | Fix |
|---|---|---|
| `Identity does not have permissions` | API key used instead of Bearer token | Ensure OAuth flow is completed and `azure_token` cookie is set |
| `BadRequest: API version not supported` | Wrong API version | Use `2025-05-01` exactly |
| `Invalid 'assistant_id': expected 'asst'` | Agent display name used instead of ID | Copy the `asst_xxx` ID from AI Foundry |
| 401 on chat route | Cookie missing or expired | User must click "Connect with Microsoft" again |
| 403 from Azure | User lacks Agent Operator role | Assign role in Azure AI Foundry project settings |

---

## Security Rules (Non-Negotiable)

- Azure is NEVER called from the browser — only from Next.js API routes
- Credentials are NEVER hardcoded — always from `process.env`
- `azure_token` is stored in an HTTP-only cookie — NEVER in localStorage
- `@azure/openai` is NOT used — this is the Agents REST API, not OpenAI chat completions
- Agent display name is NEVER used as `assistant_id` — always the `asst_xxx` format

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Token expires mid-session | Next `/api/chat` call returns 401 → right panel error step → user clicks "Connect with Microsoft" |
| Azure agent returns `failed` status | 504 error returned to client → error step in right panel |
| Network timeout during polling (>60s) | 504 returned → error step in right panel |
| `AZURE_AGENT_ID` is the display name | Azure returns `Invalid 'assistant_id'` → 502 propagated as error |
| No file attached | `contractText` is `""` → message sent without document context |
| Very large document (>80k tokens) | Azure may return a context length error → propagated as 502 in v1.0; truncation planned for v1.1 |
