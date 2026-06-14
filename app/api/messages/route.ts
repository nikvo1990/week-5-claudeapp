import { NextRequest, NextResponse } from 'next/server'
import { createMessage } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { sessionId, role, content } = await req.json()

  if (!sessionId || !role || !content) {
    return NextResponse.json({ error: 'sessionId, role, and content are required.' }, { status: 400 })
  }

  const message = await createMessage(sessionId, role, content)
  return NextResponse.json(message, { status: 201 })
}
