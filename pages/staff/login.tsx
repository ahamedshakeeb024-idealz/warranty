import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Logo from '../../components/Logo'

export default function StaffLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); return }
      localStorage.setItem('wt_token', data.token)
      localStorage.setItem('wt_staff', JSON.stringify(data.staff))
      router.push('/staff/dashboard')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Staff login — Idealz Lanka</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="flex min-h-screen items-center justify-center px-4 text-[#0B0B0F]">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mb-5 flex justify-center">
              <Logo height={52} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Staff portal</h1>
            <p className="mt-1 text-sm text-slate-600">Warranty Tracker</p>
          </div>

          <form onSubmit={handleLogin} className="glass space-y-4 rounded-[2rem] p-6">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-500">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                className="input h-12"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@idealzlanka.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-500">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input h-12 pr-16"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-white/70 hover:text-sky-700"
                >
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary h-12 w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-slate-600 underline-offset-4 transition-colors hover:text-sky-700 hover:underline">
              ← Back to customer tracker
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
