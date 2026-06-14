import { NextRequest } from 'next/server'
import { createMessage } from '@/lib/db'

const FALLBACK = 'I was unable to get a response from the AI agent. Please try again.'
const API_VERSION = '2025-05-01'
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 60_000

async function getAuthHeaders(cookieToken?: string): Promise<Record<string, string>> {
  if (cookieToken) return { Authorization: `Bearer ${cookieToken}` }
  const apiKey = process.env.AZURE_API_KEY
  if (apiKey) return { 'api-key': apiKey }
  // Fallback to DefaultAzureCredential (requires az login)
  const { DefaultAzureCredential } = await import('@azure/identity')
  const credential = new DefaultAzureCredential()
  const tokenResponse = await credential.getToken('https://ml.azure.com/.default')
  if (!tokenResponse?.token) throw Object.assign(new Error('Could not acquire Azure token'), { status: 401 })
  return { Authorization: `Bearer ${tokenResponse.token}` }
}

export async function POST(req: NextRequest) {
  const { sessionId, userMessage, contractText } = await req.json()

  if (!sessionId || !userMessage) {
    return Response.json({ error: 'sessionId and userMessage are required' }, { status: 400 })
  }

  const agentEndpoint = process.env.AZURE_AGENT_ENDPOINT
  const agentId = process.env.AZURE_AGENT_ID

  if (!agentEndpoint || !agentId) {
    return Response.json({ error: 'Azure agent not configured.' }, { status: 500 })
  }

  let authHeaders: Record<string, string>
  try {
    const cookieToken = req.cookies.get('azure_token')?.value
    authHeaders = await getAuthHeaders(cookieToken)
  } catch {
    return Response.json(
      { error: 'Not connected to Azure. Set AZURE_API_KEY in .env.local or run `az login` and restart the server.' },
      { status: 401 }
    )
  }

  async function azureFetch(path: string, method: string, body?: object) {
    const url = `${agentEndpoint}/${path}?api-version=${API_VERSION}`
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const text = await res.text()
      const err = new Error(text) as Error & { status: number }
      err.status = res.status
      throw err
    }
    return res.json()
  }

  const userMsg = await createMessage(sessionId, 'user', userMessage)

  try {
    // 1. Create thread
    const thread = await azureFetch('threads', 'POST', {})

    // 2. Add user message (include document text if provided)
    const content = contractText
      ? `Document content:\n\n${contractText}\n\n---\n\nUser question: ${userMessage}`
      : userMessage
    await azureFetch(`threads/${thread.id}/messages`, 'POST', { role: 'user', content })

    // 3. Run the agent
    const run = await azureFetch(`threads/${thread.id}/runs`, 'POST', { assistant_id: agentId })

    // 4. Poll until completed or failed (60 s timeout)
    const deadline = Date.now() + POLL_TIMEOUT_MS
    let status: string = run.status
    const runId: string = run.id

    while (status !== 'completed' && status !== 'failed') {
      if (Date.now() > deadline) {
        await createMessage(sessionId, 'assistant', FALLBACK)
        return Response.json({ error: 'AI did not respond in time. Please try again.' }, { status: 504 })
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      const polled = await azureFetch(`threads/${thread.id}/runs/${runId}`, 'GET')
      status = polled.status
    }

    if (status === 'failed') {
      await createMessage(sessionId, 'assistant', FALLBACK)
      return Response.json({ error: 'AI did not respond in time. Please try again.' }, { status: 504 })
    }

    // 5. Retrieve the assistant reply
    const msgs = await azureFetch(`threads/${thread.id}/messages`, 'GET')
    const assistantEntry = msgs.data?.find((m: { role: string }) => m.role === 'assistant')
    const assistantText: string = assistantEntry?.content?.[0]?.text?.value ?? FALLBACK

    const assistantMsg = await createMessage(sessionId, 'assistant', assistantText)

    return Response.json({
      assistantMessage: assistantText,
      userMessageId: userMsg.id,
      assistantMessageId: assistantMsg.id,
    })
  } catch (err: unknown) {
    console.error('Azure chat error:', err)
    const httpStatus = (err as { status?: number }).status ?? 0

    await createMessage(sessionId, 'assistant', FALLBACK)

    if (httpStatus === 401 || httpStatus === 403) {
      return Response.json({ error: 'Azure authentication failed.' }, { status: httpStatus })
    }
    return Response.json({ error: 'Unexpected error. Please try again.' }, { status: 500 })
  }
}
