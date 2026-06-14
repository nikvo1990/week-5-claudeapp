'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError('Invalid email or password.')
        return
      }

      localStorage.setItem('userId', data.userId)
      localStorage.setItem('userEmail', email)
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-theme="light" className="min-h-screen bg-an-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-7 h-7 bg-an-accent rounded flex items-center justify-center">
            <FileText size={13} className="text-white" strokeWidth={1.5} />
          </div>
          <span className="text-body font-medium text-an-fg-base">DocAI</span>
        </div>

        {/* Card */}
        <div className="bg-an-bg-base border border-an-border rounded-md p-8">
          <h1 className="font-serif text-display font-medium text-an-fg-base mb-2 text-center">
            Welcome back
          </h1>
          <p className="text-body-sm text-an-fg-subtle text-center mb-8">
            Sign in to continue your work.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-body-sm font-medium text-an-fg-base">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="h-9 px-3 bg-an-bg-subtle border border-an-border rounded text-body text-an-fg-base placeholder:text-an-fg-muted focus:outline-none focus:border-an-border-strong transition-colors duration-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-body-sm font-medium text-an-fg-base">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Your password"
                className="h-9 px-3 bg-an-bg-subtle border border-an-border rounded text-body text-an-fg-base placeholder:text-an-fg-muted focus:outline-none focus:border-an-border-strong transition-colors duration-100"
              />
            </div>

            {error && (
              <p className="text-caption text-an-error">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-9 w-full bg-an-accent hover:bg-an-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-label rounded transition-colors duration-150"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-body-sm text-an-fg-subtle text-center mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-an-accent hover:underline">
              Sign up
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
