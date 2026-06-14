import { supabase } from './supabase'

export type User = {
  id: string
  email: string
  password_hash: string
  created_at: string
}

export type Session = {
  id: string
  user_id: string
  title: string
  status: 'idle' | 'processing' | 'completed' | 'error'
  pinned: boolean
  created_at: string
  updated_at: string
}

export type Message = {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type Feedback = {
  id: string
  user_id: string
  session_id: string
  rating: number
  comment: string | null
  created_at: string
}

export async function getUser(email: string): Promise<User | null> {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  return data as User | null
}

export async function createUser(email: string, passwordHash: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({ email, password_hash: passwordHash })
    .select()
    .single()
  if (error) throw error
  return data as User
}

export async function createSession(userId: string, title: string): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId, title, status: 'idle', pinned: false })
    .select()
    .single()
  if (error) throw error
  return data as Session
}

export async function getSessions(userId: string): Promise<Session[]> {
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  return (data ?? []) as Session[]
}

export async function createMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ session_id: sessionId, role, content })
    .select()
    .single()
  if (error) throw error

  await supabase
    .from('sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  return data as Message
}

export async function getMessages(sessionId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  return (data ?? []) as Message[]
}

export async function createFeedback(
  userId: string,
  sessionId: string,
  rating: number,
  comment?: string
): Promise<Feedback> {
  const { data, error } = await supabase
    .from('feedback')
    .insert({ user_id: userId, session_id: sessionId, rating, comment: comment ?? null })
    .select()
    .single()
  if (error) throw error
  return data as Feedback
}
