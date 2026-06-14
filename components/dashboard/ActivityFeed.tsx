'use client'

import { useEffect, useState } from 'react'
import { FileText, MessageSquare, Plus, AlertCircle } from 'lucide-react'

type ActivityEvent = {
  id: string
  type: 'upload' | 'chat' | 'query' | 'error'
  label: string
  timestamp: string
}

const ICON_MAP: Record<ActivityEvent['type'], React.ReactNode> = {
  upload: <FileText size={13} strokeWidth={1.5} className="text-an-fg-muted" />,
  chat:   <Plus size={13} strokeWidth={1.5} className="text-an-fg-muted" />,
  query:  <MessageSquare size={13} strokeWidth={1.5} className="text-an-fg-muted" />,
  error:  <AlertCircle size={13} strokeWidth={1.5} className="text-an-error" />,
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

export default function ActivityFeed({ userId }: { userId: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/dashboard/activity?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => setEvents(data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-an-bg-surface rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <p className="text-body-sm text-an-fg-muted py-6">
        No recent activity yet. Start a new chat to get going.
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-center gap-3 py-2.5 border-b border-an-border last:border-0"
        >
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            {ICON_MAP[event.type]}
          </div>
          <span className="text-body-sm text-an-fg-subtle flex-1 truncate">{event.label}</span>
          <span className="text-caption text-an-fg-muted shrink-0">{relativeTime(event.timestamp)}</span>
        </div>
      ))}
    </div>
  )
}
