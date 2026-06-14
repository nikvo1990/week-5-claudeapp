import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [sessionsRes, messagesRes, feedbackRes] = await Promise.all([
    supabase.from('sessions').select('id,status,pinned,updated_at').eq('user_id', userId),
    supabase
      .from('messages')
      .select('id,role,created_at,session_id')
      .in(
        'session_id',
        (await supabase.from('sessions').select('id').eq('user_id', userId)).data?.map((s) => s.id) ?? []
      ),
    supabase
      .from('feedback')
      .select('rating')
      .eq('user_id', userId),
  ])

  const sessions = sessionsRes.data ?? []
  const messages = messagesRes.data ?? []
  const feedback = feedbackRes.data ?? []

  const userMessages = messages.filter((m) => m.role === 'user')
  const avgRating =
    feedback.length > 0
      ? (feedback.reduce((acc, f) => acc + f.rating, 0) / feedback.length).toFixed(1)
      : null

  return NextResponse.json({
    totalSessions: sessions.length,
    totalQueries: userMessages.length,
    queriesToday: userMessages.filter((m) => m.created_at >= todayStart).length,
    queriesThisWeek: userMessages.filter((m) => m.created_at >= weekStart).length,
    activeSessions: sessions.filter((s) => s.updated_at >= weekStart).length,
    pinnedChats: sessions.filter((s) => s.pinned).length,
    failedJobs: sessions.filter((s) => s.status === 'error').length,
    avgRating,
  })
}
