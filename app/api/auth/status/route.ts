import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const hasEndpoint = !!(process.env.AZURE_AGENT_ENDPOINT && process.env.AZURE_AGENT_ID)
  const hasCookie = !!req.cookies.get('azure_token')?.value
  const hasApiKey = !!process.env.AZURE_API_KEY
  const hasOAuth = !!process.env.AZURE_CLIENT_ID

  return NextResponse.json({ connected: hasEndpoint && (hasCookie || hasApiKey || hasOAuth) })
}
