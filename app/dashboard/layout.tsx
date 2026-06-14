'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('userId')) {
      router.push('/login')
    }
  }, [router])

  return <>{children}</>
}
