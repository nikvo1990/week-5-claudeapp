'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, X, Pin, MoreHorizontal, Loader2, CheckCircle, AlertCircle, LogOut, FileText } from 'lucide-react'
import type { Session } from '@/lib/db'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

const STATUS_ICON = {
  processing: <Loader2 size={13} strokeWidth={1.5} className="text-an-accent animate-spin" />,
  completed:  <CheckCircle size={13} strokeWidth={1.5} className="text-an-success" />,
  error:      <AlertCircle size={13} strokeWidth={1.5} className="text-an-error" />,
  idle:       null,
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

interface SidebarProps {
  sessions: Session[]
  activeSessionId: string | null
  userEmail: string
  onSelectSession: (id: string) => void
  onNewChat: () => void
  onSessionsChange: (sessions: Session[]) => void
}

export default function Sidebar({
  sessions, activeSessionId, userEmail,
  onSelectSession, onNewChat, onSessionsChange,
}: SidebarProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pinned' | 'recent' | 'completed' | 'error'>('all')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = sessions.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ? true :
      filter === 'pinned' ? s.pinned :
      filter === 'recent' ? true :
      s.status === filter
    return matchSearch && matchFilter
  })

  const pinned = filtered.filter((s) => s.pinned)
  const unpinned = filtered.filter((s) => !s.pinned)

  async function togglePin(session: Session) {
    await fetch(`/api/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !session.pinned }),
    })
    onSessionsChange(sessions.map((s) => s.id === session.id ? { ...s, pinned: !s.pinned } : s))
    setMenuOpenId(null)
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return
    await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: renameValue.trim() }),
    })
    onSessionsChange(sessions.map((s) => s.id === id ? { ...s, title: renameValue.trim() } : s))
    setRenameId(null)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    onSessionsChange(sessions.filter((s) => s.id !== id))
    setDeleteId(null)
  }

  function handleLogout() {
    localStorage.removeItem('userId')
    localStorage.removeItem('userEmail')
    router.push('/login')
  }

  function SessionItem({ session }: { session: Session }) {
    const isActive = session.id === activeSessionId
    const isRenaming = renameId === session.id
    const isMenuOpen = menuOpenId === session.id

    return (
      <div
        className={`group relative flex items-center gap-2 h-11 px-3 rounded cursor-pointer transition-colors duration-100 ${
          isActive ? 'bg-an-bg-elevated text-an-fg-base' : 'text-an-fg-subtle hover:bg-an-bg-surface hover:text-an-fg-base'
        }`}
        onClick={() => !isRenaming && onSelectSession(session.id)}
      >
        {session.pinned && <Pin size={11} strokeWidth={1.5} className="text-an-fg-muted shrink-0" />}

        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              autoFocus
              className="w-full bg-transparent text-body-sm text-an-fg-base outline-none border-b border-an-accent"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(session.id)
                if (e.key === 'Escape') setRenameId(null)
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p className="text-body-sm truncate">{session.title}</p>
          )}
          <p className="text-caption text-an-fg-muted">{formatDate(session.created_at)}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {STATUS_ICON[session.status as keyof typeof STATUS_ICON]}
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-an-bg-elevated transition-opacity"
            onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : session.id) }}
          >
            <MoreHorizontal size={13} strokeWidth={1.5} />
          </button>
        </div>

        {isMenuOpen && (
          <div className="absolute right-2 top-10 z-10 bg-an-bg-elevated border border-an-border rounded-md shadow-lg py-1 w-36 an-fade-in">
            <button
              className="w-full px-3 h-8 text-left text-body-sm text-an-fg-subtle hover:bg-an-bg-surface hover:text-an-fg-base transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePin(session) }}
            >
              {session.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              className="w-full px-3 h-8 text-left text-body-sm text-an-fg-subtle hover:bg-an-bg-surface hover:text-an-fg-base transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setRenameId(session.id)
                setRenameValue(session.title)
                setMenuOpenId(null)
              }}
            >
              Rename
            </button>
            <button
              className="w-full px-3 h-8 text-left text-body-sm text-an-error hover:bg-an-bg-surface transition-colors"
              onClick={(e) => { e.stopPropagation(); setDeleteId(session.id); setMenuOpenId(null) }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="w-64 shrink-0 bg-an-bg-subtle border-r border-an-border flex flex-col h-full">

      {/* Logo */}
      <div className="h-14 px-4 flex items-center gap-2 border-b border-an-border shrink-0">
        <div className="w-6 h-6 bg-an-accent rounded flex items-center justify-center">
          <FileText size={12} className="text-white" strokeWidth={1.5} />
        </div>
        <span className="text-body font-medium text-an-fg-base">DocAI</span>
      </div>

      {/* New chat */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full h-9 bg-an-accent hover:bg-an-accent-hover text-white text-label rounded flex items-center justify-center gap-2 transition-colors duration-150"
        >
          <Plus size={14} strokeWidth={2} />
          New chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <Search size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-an-fg-muted" />
          <input
            className="w-full h-8 pl-8 pr-7 bg-an-bg-surface border border-an-border rounded text-body-sm text-an-fg-base placeholder:text-an-fg-muted focus:outline-none focus:border-an-border-strong transition-colors"
            placeholder="Search chats…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X size={12} strokeWidth={1.5} className="text-an-fg-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-3 pb-3 flex gap-1.5 flex-wrap shrink-0">
        {(['all', 'pinned', 'recent', 'completed', 'error'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-5 px-2 rounded-full text-label uppercase tracking-wide transition-colors duration-100 ${
              filter === f
                ? 'bg-an-accent-subtle text-an-accent'
                : 'bg-an-bg-surface text-an-fg-muted hover:text-an-fg-subtle'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 flex flex-col gap-0.5">
        {pinned.length > 0 && (
          <>
            <p className="text-caption text-an-fg-muted uppercase tracking-wide px-1 py-1">Pinned</p>
            {pinned.map((s) => <SessionItem key={s.id} session={s} />)}
            {unpinned.length > 0 && <div className="border-t border-an-border my-1" />}
          </>
        )}
        {unpinned.map((s) => <SessionItem key={s.id} session={s} />)}
        {filtered.length === 0 && (
          <p className="text-body-sm text-an-fg-muted px-2 py-4">No chats found.</p>
        )}
      </div>

      {/* User footer */}
      <div className="border-t border-an-border px-4 py-3 shrink-0 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-body-sm text-an-fg-subtle truncate">{userEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-an-fg-muted hover:text-an-fg-subtle transition-colors duration-100"
          title="Log out"
        >
          <LogOut size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete chat"
        description="This will permanently delete this chat and all its messages. This cannot be undone."
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </aside>
  )
}
