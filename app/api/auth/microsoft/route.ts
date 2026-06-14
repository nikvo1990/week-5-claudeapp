import { NextResponse } from 'next/server'

export async function GET() {
  // If OAuth credentials are configured, use the full MSAL flow
  if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID) {
    const { ConfidentialClientApplication } = await import('@azure/msal-node')
    const cca = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      },
    })
    const url = await cca.getAuthCodeUrl({
      scopes: ['https://ml.azure.com/user_impersonation', 'offline_access'],
      redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/microsoft/callback`,
    })
    return NextResponse.redirect(url)
  }

  // Local dev: use az login session via DefaultAzureCredential
  try {
    const { DefaultAzureCredential } = await import('@azure/identity')
    const credential = new DefaultAzureCredential()
    const tokenResponse = await credential.getToken('https://ai.azure.com/.default')
    if (!tokenResponse?.token) {
      return NextResponse.redirect(new URL('/login?error=azure_token_failed', process.env.NEXTAUTH_URL!))
    }
    const response = NextResponse.redirect(new URL('/dashboard/chat', process.env.NEXTAUTH_URL!))
    response.cookies.set('azure_token', tokenResponse.token, {
      httpOnly: true,
      secure: false,
      maxAge: 3600,
      path: '/',
    })
    return response
  } catch {
    return NextResponse.redirect(new URL('/login?error=azure_auth_failed', process.env.NEXTAUTH_URL!))
  }
}
