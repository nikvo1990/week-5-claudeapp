import { NextRequest, NextResponse } from 'next/server'
import { ConfidentialClientApplication } from '@azure/msal-node'

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
  },
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', req.url))
  }

  const cca = new ConfidentialClientApplication(msalConfig)

  const result = await cca.acquireTokenByCode({
    code,
    scopes: ['https://ml.azure.com/user_impersonation', 'offline_access'],
    redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/microsoft/callback`,
  })

  const response = NextResponse.redirect(new URL('/dashboard', req.url))
  response.cookies.set('azure_token', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600,
    path: '/',
  })

  return response
}
