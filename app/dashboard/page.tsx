'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, MessageSquare, Clock, Pin,
  AlertCircle, BarChart3, Plus, LogOut
} from 'lucide-react'
import KPICard from '@/components/dashboard/KPICard'
import ActivityFeed from '@/components/dashboard/ActivityFeed'

type KPIData = {
  totalSessions: number
  totalQueries: number
  queriesToday: number
  queriesThisWeek: number
  activeSessions: number
  pinnedChats: number
  failedJobs: number
  avgRating: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [kpis, setKpis] = useState<KPIData | null>(null)

  useEffect(() => {
    const uid = localStorage.getItem('userId') ?? ''
    const email = localStorage.getItem('userEmail') ?? ''
    if (!uid) { router.push('/login'); return }
    setUserId(uid)
    setUserEmail(email)
    fetchKpis(uid)
  }, [router])

  async function fetchKpis(uid: string) {
    const res = await fetch(`/api/dashboard/kpis?userId=${uid}`)
    if (res.ok) setKpis(await res.json())
  }

  function handleLogout() {
    localStorage.removeItem('userId')
    localStorage.removeItem('userEmail')
    router.push('/login')
  }

  const v = (n: number | undefined) => (n === undefined ? '—' : String(n))

  const kpiCards = [
    { label: 'Chat sessions', value: v(kpis?.totalSessions), icon: <MessageSquare size={14} strokeWidth={1.5} /> },
    { label: 'Active sessions (7 days)', value: v(kpis?.activeSessions), icon: <Clock size={14} strokeWidth={1.5} /> },
    { label: 'Total AI queries', value: v(kpis?.totalQueries), icon: <BarChart3 size={14} strokeWidth={1.5} /> },
    { label: 'Queries this week', value: v(kpis?.queriesThisWeek), icon: <BarChart3 size={14} strokeWidth={1.5} /> },
    { label: 'Queries today', value: v(kpis?.queriesToday), icon: <MessageSquare size={14} strokeWidth={1.5} /> },
    { label: 'Pinned chats', value: v(kpis?.pinnedChats), icon: <Pin size={14} strokeWidth={1.5} /> },
    { label: 'AI accuracy (avg rating)', value: kpis?.avgRating ?? '—', icon: <BarChart3 size={14} strokeWidth={1.5} /> },
    { label: 'Failed jobs', value: v(kpis?.failedJobs), icon: <AlertCircle size={14} strokeWidth={1.5} /> },
    { label: 'Documents processed', value: v(kpis?.totalSessions), icon: <FileText size={14} strokeWidth={1.5} /> },
  ]

  return (
    <div className="min-h-screen bg-an-bg-base flex flex-col">

      {/* Top bar */}
      <header className="h-14 border-b border-an-border px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-an-accent rounded flex items-center justify-center">
            <FileText size={12} className="text-white" strokeWidth={1.5} />
          </div>
          <span className="text-body font-medium text-an-fg-base">DocAI</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-body-sm text-an-fg-subtle">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-body-sm text-an-fg-muted hover:text-an-fg-subtle transition-colors duration-100"
          >
            <LogOut size={13} strokeWidth={1.5} />
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">

        {/* Page heading */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-title font-medium text-an-fg-base">Dashboard</h1>
          <Link
            href="/dashboard/chat"
            className="h-9 px-4 bg-an-accent hover:bg-an-accent-hover text-white text-label rounded flex items-center gap-2 transition-colors duration-150"
          >
            <Plus size={14} strokeWidth={2} />
            New chat
          </Link>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {kpiCards.map((kpi) => (
            <KPICard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} />
          ))}
        </div>

        {/* Activity feed */}
        <div>
          <h2 className="text-body font-medium text-an-fg-base mb-4">Recent activity</h2>
          {userId && <ActivityFeed userId={userId} />}
        </div>

      </main>
    </div>
  )
}
