'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Wifi } from 'lucide-react'
import Sidebar from '@/components/chat/Sidebar'
import ChatArea from '@/components/chat/ChatArea'
import RightPanel from '@/components/chat/RightPanel'
import type { Session, Message } from '@/lib/db'
import type { Step, DocumentPreview } from '@/lib/types'

export default function ChatPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [documentText, setDocumentText] = useState('')
  const [documentFileName, setDocumentFileName] = useState('')
  const [documentPreview, setDocumentPreview] = useState<DocumentPreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  const [azureConnected, setAzureConnected] = useState<boolean | null>(null)

  useEffect(() => {
    const uid = localStorage.getItem('userId')
    const email = localStorage.getItem('userEmail')
    if (!uid) { router.push('/login'); return }
    setUserId(uid)
    setUserEmail(email ?? '')
    fetchSessions(uid)
    checkAzureStatus()
  }, [router])

  async function checkAzureStatus() {
    const res = await fetch('/api/auth/status')
    if (res.ok) {
      const { connected } = await res.json()
      setAzureConnected(connected)
    }
  }

  async function fetchSessions(uid: string) {
    const res = await fetch(`/api/sessions?userId=${uid}`)
    if (res.ok) {
      const data = await res.json()
      setSessions(data)
    }
  }

  async function loadMessages(sessionId: string) {
    setMessages([])
    setActiveSessionId(sessionId)
    setSteps([])
    const res = await fetch(`/api/sessions/${sessionId}/messages`)
    if (res.ok) {
      setMessages(await res.json())
    }
  }

  async function handleNewChat() {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title: 'New session' }),
    })
    if (res.ok) {
      const session = await res.json()
      setSessions((prev) => [session, ...prev])
      setActiveSessionId(session.id)
      setMessages([])
      setSteps([])
      setDocumentText('')
      setDocumentFileName('')
      setDocumentPreview(null)
    }
  }

  async function updateSessionStatus(sessionId: string, status: Session['status']) {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    })
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status } : s))
    )
  }

  async function autoTitleSession(sessionId: string, firstMessage: string, allMessages: Message[]) {
    const session = sessions.find((s) => s.id === sessionId)
    if (!session || session.title !== 'New session') return
    if (allMessages.filter((m) => m.role === 'user').length > 1) return

    const title = firstMessage.slice(0, 55) + (firstMessage.length > 55 ? '…' : '')
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
    )
  }

  const handleSendMessage = useCallback(
    async (userMessage: string) => {
      if (!activeSessionId || isLoading) return
      setIsLoading(true)

      const userMsg: Message = {
        id: crypto.randomUUID(),
        session_id: activeSessionId,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setSteps([{ label: 'Sending to AI…', status: 'running' }])

      await updateSessionStatus(activeSessionId, 'processing')

      try {
        // Auto-title the session from the first message
        await autoTitleSession(activeSessionId, userMessage, [...messages, userMsg])

        setSteps([
          { label: 'Sending to AI…', status: 'completed' },
          { label: 'Waiting for response…', status: 'running' },
        ])

        // /api/chat saves both messages and returns the assistant reply
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSessionId,
            userMessage,
            contractText: documentText,
          }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error ?? 'AI request failed')
        }

        const { assistantMessage, assistantMessageId } = await res.json()

        setSteps([
          { label: 'Sending to AI…', status: 'completed' },
          { label: 'Waiting for response…', status: 'completed' },
          { label: 'Response received', status: 'completed' },
        ])

        const assistantMsg: Message = {
          id: assistantMessageId ?? crypto.randomUUID(),
          session_id: activeSessionId,
          role: 'assistant',
          content: assistantMessage,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])

        await updateSessionStatus(activeSessionId, 'completed')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setSteps((prev) => [
          ...prev.slice(0, -1),
          { label: `Error — ${msg}`, status: 'error' },
        ])
        await updateSessionStatus(activeSessionId, 'error')
      } finally {
        setIsLoading(false)
      }
    },
    [activeSessionId, isLoading, documentText, userId, sessions, messages]
  )

  return (
    <div className="h-screen bg-an-bg-base flex flex-col overflow-hidden">

      {/* Azure connection banner */}
      {azureConnected === false && (
        <div className="shrink-0 bg-an-warning/10 border-b border-an-warning/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-body-sm text-an-warning">
            <Wifi size={14} strokeWidth={1.5} />
            AI chat is not connected. Sign in with Microsoft to enable it.
          </div>
          <a
            href="/api/auth/microsoft"
            className="h-7 px-3 bg-an-warning/20 hover:bg-an-warning/30 text-an-warning text-label rounded transition-colors duration-150 flex items-center"
          >
            Connect with Microsoft
          </a>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          userEmail={userEmail}
          onSelectSession={loadMessages}
          onNewChat={handleNewChat}
          onSessionsChange={setSessions}
        />
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          documentFileName={documentFileName}
          activeSessionId={activeSessionId}
          userId={userId}
          onSendMessage={handleSendMessage}
          onNewChat={handleNewChat}
          onFileLoad={(text, fileName, preview) => {
            setDocumentText(text)
            setDocumentFileName(fileName)
            setDocumentPreview(preview)
            setSteps([{ label: 'Document parsed', status: 'completed' }])
          }}
          onClearFile={() => {
            setDocumentText('')
            setDocumentFileName('')
            setDocumentPreview(null)
          }}
        />
        <RightPanel steps={steps} documentPreview={documentPreview} />
      </div>

    </div>
  )
}
