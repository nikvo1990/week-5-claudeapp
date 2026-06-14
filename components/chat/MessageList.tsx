'use client'

import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import type { Message } from '@/lib/db'
import MessageBubble from './MessageBubble'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  userId: string
  sessionId: string
}

export default function MessageList({ messages, isLoading, userId, sessionId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-[680px] mx-auto px-6 flex flex-col gap-6">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            userId={userId}
            sessionId={sessionId}
          />
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <span className="w-2 h-2 bg-an-accent rounded-full mt-1 shrink-0" />
            <Loader2 size={16} strokeWidth={1.5} className="text-an-fg-muted animate-spin mt-0.5" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
