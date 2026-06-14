import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id,title,status,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(25)

  if (!sessions || sessions.length === 0) {
    return NextResponse.json([])
  }

  const sessionIds = sessions.map((s) => s.id)

  const { data: messages } = await supabase
    .from('messages')
    .select('id,session_id,role,content,created_at')
    .in('session_id', sessionIds)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(25)

  type Event = {
    id: string
    type: 'chat' | 'query' | 'error'
    label: string
    timestamp: string
  }

  const events: Event[] = []

  for (const s of sessions) {
    events.push({
      id: `session-${s.id}`,
      type: s.status === 'error' ? 'error' : 'chat',
      label:
        s.status === 'error'
          ? `Processing failed for "${s.title}"`
          : `New chat: ${s.title}`,
      timestamp: s.created_at,
    })
  }

  for (const m of messages ?? []) {
    const preview = m.content.slice(0, 60)
    events.push({
      id: `msg-${m.id}`,
      type: 'query',
      label: `Asked: ${preview}${m.content.length > 60 ? '…' : ''}`,
      timestamp: m.created_at,
    })
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json(events.slice(0, 50))
}
