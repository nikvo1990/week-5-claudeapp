'use client'

import { useRef, useCallback } from 'react'
import { Paperclip, Send, X, FileText } from 'lucide-react'
import type { Message } from '@/lib/db'
import type { DocumentPreview } from '@/lib/types'
import { parseFile } from '@/lib/parse-file'
import MessageList from './MessageList'

interface ChatAreaProps {
  messages: Message[]
  isLoading: boolean
  documentFileName: string
  activeSessionId: string | null
  userId: string
  onSendMessage: (msg: string) => void
  onFileLoad: (text: string, fileName: string, preview: DocumentPreview) => void
  onClearFile: () => void
  onNewChat: () => Promise<void>
}

export default function ChatArea({
  messages, isLoading, documentFileName, activeSessionId,
  userId, onSendMessage, onFileLoad, onClearFile, onNewChat,
}: ChatAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(() => {
    const msg = textareaRef.current?.value.trim()
    if (!msg || isLoading || !activeSessionId) return
    if (textareaRef.current) textareaRef.current.value = ''
    autoResize()
    onSendMessage(msg)
  }, [isLoading, activeSessionId, onSendMessage])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!activeSessionId) {
      await onNewChat()
    }

    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      alert('File is too large. Maximum size is 10MB.')
      return
    }

    const isPdf = file.type === 'application/pdf'
    const isDocx =
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')

    if (!isPdf && !isDocx) {
      alert('Only PDF and DOCX files are supported.')
      return
    }

    try {
      const text = await parseFile(file)
      const url = isPdf ? URL.createObjectURL(file) : ''
      onFileLoad(text, file.name, {
        url,
        type: isPdf ? 'pdf' : 'docx',
        filename: file.name,
        text: isDocx ? text : undefined,
      })
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to parse file.')
    }

    e.target.value = ''
  }

  return (
    <main className="flex-1 flex flex-col h-full bg-an-bg-base min-w-0">

      {/* Empty state */}
      {!activeSessionId && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 bg-an-bg-surface border border-an-border rounded-lg flex items-center justify-center">
            <FileText size={18} strokeWidth={1.5} className="text-an-fg-muted" />
          </div>
          <p className="text-body text-an-fg-muted text-center max-w-xs">
            Start a new conversation or select an existing one from the sidebar.
          </p>
        </div>
      )}

      {/* Message list */}
      {activeSessionId && (
        <MessageList messages={messages} isLoading={isLoading} userId={userId} sessionId={activeSessionId} />
      )}

      {/* Composer */}
      <div className="shrink-0 px-6 pb-6 pt-3">
        <div className="max-w-[680px] mx-auto">

          {/* File chip */}
          {documentFileName && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 bg-an-bg-surface border border-an-border rounded px-2 h-6 text-body-sm text-an-fg-subtle">
                <FileText size={11} strokeWidth={1.5} />
                <span className="truncate max-w-[200px]">{documentFileName}</span>
                <button onClick={onClearFile} className="ml-1">
                  <X size={11} strokeWidth={1.5} className="text-an-fg-muted hover:text-an-fg-subtle" />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="bg-an-bg-surface border border-an-border rounded-xl p-3 flex items-end gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-an-fg-muted hover:text-an-fg-subtle transition-colors duration-100 shrink-0 mb-0.5"
              title="Attach file"
            >
              <Paperclip size={16} strokeWidth={1.5} />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={activeSessionId ? 'Ask about the document…' : 'Start a new chat first'}
              disabled={!activeSessionId || isLoading}
              onInput={autoResize}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              className="flex-1 bg-transparent resize-none text-body text-an-fg-base placeholder:text-an-fg-muted outline-none max-h-[200px] leading-relaxed disabled:opacity-50"
            />

            <button
              onClick={handleSend}
              disabled={!activeSessionId || isLoading}
              className="w-8 h-8 bg-an-accent hover:bg-an-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shrink-0 transition-colors duration-150"
            >
              <Send size={14} strokeWidth={1.5} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

    </main>
  )
}
