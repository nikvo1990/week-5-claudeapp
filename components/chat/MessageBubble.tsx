import type { Message } from '@/lib/db'
import FeedbackForm from './FeedbackForm'

interface MessageBubbleProps {
  message: Message
  userId: string
  sessionId: string
}

function formatTimestamp(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ message, userId, sessionId }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div
          className="max-w-[75%] bg-an-accent-subtle border border-[rgba(217,119,87,0.20)] rounded-[12px_12px_4px_12px] px-4 py-3 text-body text-an-fg-base"
          style={{ wordBreak: 'break-word' }}
        >
          {message.content}
        </div>
        <time className="text-caption text-an-fg-muted">{formatTimestamp(message.created_at)}</time>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <span className="w-2 h-2 bg-an-accent rounded-full mt-1.5 shrink-0" />
        <div className="flex-1 text-body text-an-fg-base leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
      <time className="text-caption text-an-fg-muted ml-5">{formatTimestamp(message.created_at)}</time>
      <div className="ml-5 mt-1">
        <FeedbackForm messageId={message.id} userId={userId} sessionId={sessionId} />
      </div>
    </div>
  )
}
