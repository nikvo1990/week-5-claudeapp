import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DocAI — AI Document Assistant',
  description: 'Analyse any document in seconds with Azure AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
