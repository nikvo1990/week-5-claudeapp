# File Upload Spec — Document Attachment and Parsing

## Feature Name
Document Attachment — client-side PDF and DOCX parsing with preview display in the right panel.

---

## Description

- **Accepted types:** `.pdf` (text-based only) and `.docx`
- **What happens:** File is parsed entirely in the browser using JavaScript libraries — the raw file is never sent to the server
- **Processing location:** 100% client-side (`lib/parse-file.ts`)
- **What reaches the backend:** Extracted plain text string sent as `contractText` in the `POST /api/chat` JSON body
- **Persistence:** File content stored in component state only (`documentText` in `app/dashboard/chat/page.tsx`). Not saved to the database. Cleared when the user dismisses the file or starts a new session.
- **Preview:** Shown in the right panel — PDF as an `<iframe>` with a blob URL, DOCX as a `<pre>` with extracted text truncated at 4,000 chars

---

## User Flow

1. User clicks the paperclip icon (`📎`) in the chat composer
2. Hidden `<input type="file" accept=".pdf,.docx">` is triggered programmatically
3. Browser file picker opens — user selects a file
4. **Client-side validation runs first:**
   - File size > 10MB → alert and abort (no parsing)
   - File type not PDF or DOCX → alert and abort
5. `parseFile(file)` is called from `lib/parse-file.ts`
6. On success:
   - `documentText` (extracted plain text) is stored in page state
   - `documentFileName` (e.g. `"contract.pdf"`) is stored in page state
   - `documentPreview` object is stored in page state: `{ url: blobUrl, type: 'pdf'|'docx', filename }`
   - A filename chip appears above the composer
   - Right panel shows the preview
   - Right panel execution steps shows "Document parsed ✓"
7. On parse failure: alert with the error message; no state changes
8. User can remove the file by clicking `×` on the filename chip → all file state clears, blob URL is revoked, preview disappears
9. After sending a message: file state persists (user can ask follow-up questions about the same document without re-uploading)
10. On new session start or session switch: file state clears entirely

---

## How Content Reaches the Backend

- Route: `POST /api/chat`
- Field name: `contractText`
- Type: JSON string
- Sent on every message — even follow-up questions include the full document text
- When no file attached: `contractText` is an empty string `""`
- Max length: no hard truncation in v1.0; the Azure AI Agent's context window handles it (planned: truncate at 80k tokens with user warning in v1.1)

---

## Parsing Strategy

**All parsing is client-side.** The raw file is never uploaded.

### PDF — `pdfjs-dist`

| Property | Value |
|---|---|
| File extension | `.pdf` |
| MIME type | `application/pdf` |
| Library | `pdfjs-dist@4.7.76` |
| Import | `import('pdfjs-dist')` (dynamic, lazy — prevents SSR issues) |
| Worker | CDN: `https://unpkg.com/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs` |
| Method | `getDocument({ data: arrayBuffer }).promise` → iterate pages → `getTextContent()` |
| Return value | Plain text string (all pages concatenated with `\n\n`) |
| Scanned PDF detection | If extracted text is empty after parsing all pages → throw: "This PDF appears to be scanned. Please upload a text-based PDF." |

**Worker setup note:** `GlobalWorkerOptions.workerSrc` must be set before calling `getDocument`. The CDN URL is used to avoid copying the worker file to `/public/` in development.

### DOCX — `mammoth`

| Property | Value |
|---|---|
| File extension | `.docx` |
| MIME type | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Library | `mammoth@1.8.0` |
| Import | `import('mammoth')` (dynamic) |
| Method | `mammoth.extractRawText({ arrayBuffer })` |
| Return value | `result.value` — plain text string |

**Parsing function** (`lib/parse-file.ts`):
```
parseFile(file: File): Promise<string>
  ├── if PDF  → parsePDF(file)
  ├── if DOCX → parseDOCX(file)
  └── else    → throw "Unsupported file type"
```

---

## Content Preview

### PDF Preview
- Create blob URL before parsing: `URL.createObjectURL(file)`
- Pass `{ url: blobUrl, type: 'pdf', filename }` to page state as `documentPreview`
- Render in right panel: `<iframe src={blobUrl} className="w-full h-56 rounded border border-an-border" />`
- Caption: "Scroll inside the preview to navigate pages."
- Revoke blob URL when file is cleared: `URL.revokeObjectURL(blobUrl)` (currently handled by browser GC; explicit revoke on clear is a v1.1 improvement)

### DOCX Preview
- No visual preview — text extraction replaces visual rendering
- Right panel shows: `<pre>` with first 4,000 chars of extracted text
- If longer: append `"… (preview truncated)"` to the pre content
- Styles: `font-mono text-[12px] text-an-fg-subtle overflow-y-auto max-h-56 whitespace-pre-wrap`

### Preview Location
- Right panel (`components/chat/RightPanel.tsx`), below the execution steps section
- Persists while user chats — not cleared on message send
- Hidden when no document is attached

---

## State Architecture — CRITICAL

**Owner:** `app/dashboard/chat/page.tsx`

```
page.tsx
  documentText:    string          ← extracted plain text (sent to /api/chat)
  documentFileName: string         ← "contract.pdf" (shown in chip)
  documentPreview: DocumentPreview | null  ← { url, type, filename }
```

`ChatArea` receives:
- `documentFileName` — to render the chip
- `onFileLoad(text, fileName, preview)` — callback; ChatArea calls this after parsing
- `onClearFile()` — callback; ChatArea calls this when × is clicked

`RightPanel` receives:
- `documentPreview` — to render the preview section

`ChatArea` owns no file state. It only calls `parseFile()` and invokes the callbacks.

**Callback signature:**
```ts
onFileLoad(text: string, fileName: string, preview: DocumentPreview): void
```

**DocumentPreview type:**
```ts
type DocumentPreview = {
  url: string       // blob URL (PDF) or "" (DOCX)
  type: 'pdf' | 'docx'
  filename: string
}
```

---

## API Contract

- Route: `POST /api/chat`
- Field: `contractText: string`
- Included: in every message send, even when no document is attached (empty string)
- The backend never receives the raw file — only the extracted text

---

## Validation

| Check | When | Error message | How displayed |
|---|---|---|---|
| Unsupported file type | On file input change | "Only PDF and DOCX files are supported." | `alert()` (v1.0); inline error in v1.1 |
| File > 10MB | On file input change | "File is too large. Maximum size is 10MB." | `alert()` |
| Scanned PDF (no text) | During pdfjs parsing | "This PDF appears to be scanned. Please upload a text-based PDF." | `alert()` |
| DOCX parse failure | During mammoth parsing | Error message from mammoth | `alert()` |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| User selects a second file | Previous `documentText`, `documentFileName`, `documentPreview` are replaced; old blob URL is NOT explicitly revoked in v1.0 |
| User removes file mid-conversation | All file state clears; right panel preview disappears; next message sent without `contractText` |
| File parse fails mid-way | `alert()` shown; no state changes; user can try another file |
| Empty PDF (0 pages) | `parsePDF` returns empty string → scanned PDF error is thrown |
| Protected/encrypted PDF | `pdfjs-dist` may throw or return empty text → scanned PDF error is shown |
| User reopens a past session | Document text is NOT reloaded — user must re-attach the file to continue analysis |
| User submits a question with no file | `contractText` is `""` — AI answers without document context; no warning in v1.0 |
