'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

interface FeedbackFormProps {
  messageId: string
  userId: string
  sessionId: string
}

export default function FeedbackForm({ messageId, userId, sessionId }: FeedbackFormProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (submitted) {
    return <p className="text-caption text-an-fg-muted">Thanks for your feedback.</p>
  }

  async function handleSubmit() {
    if (!rating) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionId, rating, comment: comment || undefined }),
    })

    if (res.ok) {
      setSubmitted(true)
    } else {
      setError('Could not save feedback. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Stars */}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(n)}
            className="p-0.5"
          >
            <Star
              size={14}
              strokeWidth={1.5}
              className={`transition-colors duration-100 ${
                n <= (hovered || rating) ? 'text-an-accent fill-an-accent' : 'text-an-fg-muted'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Comment + submit */}
      {rating > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="Optional comment…"
              rows={2}
              className="w-full max-w-[400px] bg-an-bg-surface border border-an-border rounded px-3 py-2 text-body-sm text-an-fg-base placeholder:text-an-fg-muted outline-none focus:border-an-border-strong resize-none transition-colors"
            />
            <span className="text-caption text-an-fg-muted absolute bottom-2 right-3">
              {comment.length}/200
            </span>
          </div>

          {error && <p className="text-caption text-an-error">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="self-start h-7 px-3 bg-an-accent hover:bg-an-accent-hover disabled:opacity-50 text-white text-label rounded transition-colors duration-150"
          >
            {loading ? 'Saving…' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  )
}
