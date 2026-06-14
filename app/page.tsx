'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, MessageSquare, Zap, Shield, BarChart3, Check } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('userId')) {
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-an-bg-base text-an-fg-base font-sans">

      {/* Navbar */}
      <nav className="border-b border-an-border px-6 h-14 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-an-accent rounded flex items-center justify-center">
            <FileText size={12} className="text-white" strokeWidth={1.5} />
          </div>
          <span className="text-body font-medium text-an-fg-base">DocAI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-body text-an-fg-subtle hover:text-an-fg-base transition-colors duration-100"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="h-8 px-4 bg-an-accent hover:bg-an-accent-hover text-white text-label rounded flex items-center transition-colors duration-150"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-an-accent-subtle border border-an-accent/20 rounded-full px-3 h-6 mb-8">
          <span className="w-1.5 h-1.5 bg-an-accent rounded-full" />
          <span className="text-label text-an-accent uppercase tracking-wide">Powered by Azure AI</span>
        </div>
        <h1 className="font-serif text-[42px] font-medium leading-[1.15] text-an-fg-base mb-5">
          Analyse any document.<br />Get answers instantly.
        </h1>
        <p className="text-body text-an-fg-subtle mb-10 max-w-xl mx-auto leading-relaxed">
          Upload a PDF or Word document, ask questions in plain English, and get grounded answers with source citations. No expertise required.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="h-9 px-5 bg-an-accent hover:bg-an-accent-hover text-white text-label rounded flex items-center transition-colors duration-150"
          >
            Get started free
          </Link>
          <a
            href="#how-it-works"
            className="h-9 px-5 border border-an-border hover:bg-an-bg-surface text-an-fg-base text-label rounded flex items-center transition-colors duration-150"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-an-border">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-title text-center text-an-fg-base mb-14">How it works</h2>
          <div className="grid grid-cols-3 gap-10">
            {[
              {
                step: '01',
                title: 'Upload your document',
                desc: 'Drop in a PDF or Word file. Parsed entirely in your browser — never stored on our servers.',
              },
              {
                step: '02',
                title: 'Ask your questions',
                desc: 'Type any question about the document in plain English. No special syntax required.',
              },
              {
                step: '03',
                title: 'Get instant answers',
                desc: 'Receive clear, grounded responses with source references. Rate each answer to improve accuracy.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col gap-3">
                <span className="font-mono text-label text-an-accent">{step}</span>
                <h3 className="text-body font-medium text-an-fg-base">{title}</h3>
                <p className="text-body-sm text-an-fg-subtle leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-an-border">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-title text-center text-an-fg-base mb-14">Built for serious work</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                icon: MessageSquare,
                title: 'Persistent session history',
                desc: 'Every conversation is saved. Return to any past analysis and pick up where you left off.',
              },
              {
                icon: Zap,
                title: 'Real-time execution trace',
                desc: 'Watch the AI agent work — parsing, querying, responding — step by step in the right panel.',
              },
              {
                icon: Shield,
                title: 'Privacy-first',
                desc: 'Documents are parsed in-browser and never persisted server-side. Your content stays yours.',
              },
              {
                icon: BarChart3,
                title: 'Feedback loop',
                desc: 'Rate every response. Ratings train the system over time, building accuracy on your document types.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-an-bg-surface border border-an-border rounded-md p-5 flex gap-4"
              >
                <div className="w-8 h-8 bg-an-accent-subtle rounded flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={15} className="text-an-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-body font-medium text-an-fg-base mb-1">{title}</h3>
                  <p className="text-body-sm text-an-fg-subtle leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-an-border">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-title text-center text-an-fg-base mb-2">Simple pricing</h2>
          <p className="text-body-sm text-an-fg-subtle text-center mb-14">
            Start free. Scale as you grow.
          </p>
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                name: 'Free trial',
                price: '$0',
                period: '14 days',
                features: ['5 document analyses', '1 user', 'Chat history'],
                cta: 'Start free',
                accent: false,
              },
              {
                name: 'Starter',
                price: '$29',
                period: '/month',
                features: ['20 analyses', '1 user', 'Chat history', 'Feedback export'],
                cta: 'Get started',
                accent: false,
              },
              {
                name: 'Growth',
                price: '$79',
                period: '/month',
                features: ['100 analyses', '5 users', 'Chat history', 'Feedback export', 'Priority support'],
                cta: 'Get started',
                accent: true,
              },
              {
                name: 'Pro',
                price: '$199',
                period: '/month',
                features: ['Unlimited analyses', '20 users', 'Everything in Growth', 'SLA guarantee'],
                cta: 'Get started',
                accent: false,
              },
            ].map(({ name, price, period, features, cta, accent }) => (
              <div
                key={name}
                className={`rounded-md p-5 border flex flex-col gap-5 ${
                  accent
                    ? 'bg-an-accent-subtle border-[rgba(217,119,87,0.30)]'
                    : 'bg-an-bg-surface border-an-border'
                }`}
              >
                <div>
                  <div className="text-body-sm text-an-fg-subtle mb-2">{name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-display font-medium text-an-fg-base">{price}</span>
                    <span className="text-caption text-an-fg-muted">{period}</span>
                  </div>
                </div>
                <ul className="flex flex-col gap-2 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-body-sm text-an-fg-subtle">
                      <Check size={12} className="text-an-success shrink-0" strokeWidth={2} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`h-9 flex items-center justify-center text-label rounded transition-colors duration-150 ${
                    accent
                      ? 'bg-an-accent hover:bg-an-accent-hover text-white'
                      : 'bg-an-bg-elevated hover:bg-an-border-strong text-an-fg-base border border-an-border'
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-an-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-caption text-an-fg-muted">
            2026 DocAI. AI-generated analysis only — not professional advice.
          </p>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Contact'].map((label) => (
              <a
                key={label}
                href="#"
                className="text-caption text-an-fg-muted hover:text-an-fg-subtle transition-colors duration-100"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}
