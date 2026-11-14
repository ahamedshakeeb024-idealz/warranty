import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getFinalStage, DeviceType } from '../lib/supabase'
import Logo from '../components/Logo'

type Mode = 'job' | 'serial' | 'imei'

interface StageHistory { stage: string; created_at: string }
interface Job {
  job_no: string; serial_number: string | null; imei: string | null; customer_name: string
  model: string; color: string | null; storage: string | null; received_date: string
  received_branch?: string | null; current_stage: string; device_type: DeviceType
  stage_history: StageHistory[]
}

const MODES: { id: Mode; short: string; label: string; param: string; placeholder: string; hint: string }[] = [
  { id: 'job',    short: 'Job no.', label: 'Job number',    param: 'job_no', placeholder: 'e.g. 0654',         hint: 'Printed on your service receipt' },
  { id: 'serial', short: 'Serial',  label: 'Serial number', param: 'serial', placeholder: 'e.g. F2LXQ0ABHG7H', hint: 'Settings › General › About' },
  { id: 'imei',   short: 'IMEI',    label: 'IMEI number',   param: 'imei',   placeholder: '15-digit number',   hint: 'Dial *#06# on your phone' },
]

const TYPE_LABELS: Record<DeviceType, string> = { apple: 'Apple device', genext: 'Genext device', other: 'Other device' }
const BRANCHES = ['Idealz Prime', 'Idealz Marino', 'Idealz Liberty Plaza']

// What the customer sees
const CUSTOMER_STEPS = [
  { title: 'Repair Requested',    text: 'Your service request has been registered by iDealz.' },
  { title: 'Handed over to Authorized Repair Center', text: 'Your device has been handed over to an authorized repair center for warranty service.' },
  { title: 'Under Inspection',    text: 'Our technical team is checking your device and identifying the issue.' },
  { title: 'Under Repair',        text: 'Your device is currently being repaired.' },
  { title: 'Repair Completed',    text: 'Repair is complete. Your device is undergoing final checks or is ready for collection.' },
  { title: 'Ready for Collection', text: 'Your device is ready. You can collect it from the iDealz branch.' },
]

// Internal stage -> customer step (1 to 6). Edit these numbers to change the mapping.
const STAGE_TO_STEP: Record<DeviceType, Record<string, number>> = {
  apple: {
    device_received: 1, appointment_done: 1,
    handed_over_relevant: 2,
    sent_to_dubai: 3,
    at_apple_mall: 4,
    received_from_apple_mall: 5, sent_to_sl: 5,
    received_at_prime: 6, handed_over_customer: 6,
  },
  genext: {
    device_received: 1,
    handed_over_genext: 2,
    job_reference_received: 3,
    sent_to_dubai: 4, at_apple_mall: 4,
    device_ready_genext: 5, received_from_apple_mall: 5, sent_to_sl: 5,
    device_received_prime: 6, received_at_prime: 6, handed_over_customer: 6,
  },
  other: {
    device_received: 1,
    handed_over_relevant: 2,
    sent_to_dubai: 3,
    received_supplier: 5, sent_to_sl: 5,
    received_at_prime: 6, handed_over_customer: 6,
  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return formatDate(iso)
}
function maskName(name: string) {
  return name.split(' ').filter(Boolean)
    .map(w => (w.length <= 1 ? w : w[0] + '•'.repeat(Math.min(w.length - 1, 6))))
    .join(' ')
}

function CheckIcon() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M22 12a10 10 0 00-10-10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export default function TrackPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('job')
  const [value, setValue] = useState('')
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const autoRan = useRef(false)

  const modeIdx = Math.max(0, MODES.findIndex(m => m.id === mode))
  const activeMode = MODES[modeIdx]

  async function runSearch(m: Mode, raw: string) {
    const v = raw.trim()
    const cfg = MODES.find(x => x.id === m) ?? MODES[0]
    if (!v) { setError(`Please enter your ${cfg.label.toLowerCase()}.`); return }
    setLoading(true); setError(''); setJob(null)
    try {
      const res = await fetch(`/api/track?${cfg.param}=${encodeURIComponent(v)}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'We could not find that device.'); return }
      setJob(data)
      router.replace({ pathname: '/', query: { [m]: v } }, undefined, { shallow: true, scroll: false })
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } catch {
      setError('Connection problem. Please check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    runSearch(mode, value)
  }

  function reset() {
    setJob(null); setValue(''); setError('')
    router.replace('/', undefined, { shallow: true, scroll: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => inputRef.current?.focus(), 300)
  }

  useEffect(() => {
    if (!router.isReady || autoRan.current) return
    autoRan.current = true
    const found = (['job', 'serial', 'imei'] as Mode[]).find(
      k => typeof router.query[k] === 'string' && (router.query[k] as string).trim() !== ''
    )
    if (found) {
      const v = (router.query[found] as string).trim()
      setMode(found); setValue(v); runSearch(found, v)
    }
  }, [router.isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  function shareUrl() {
    return `${window.location.origin}/?job=${encodeURIComponent(job?.job_no ?? '')}`
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard not available */ }
  }
  function shareWhatsApp() {
    const text = `Track my device repair (Job ${job?.job_no}): ${shareUrl()}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  // ── Customer view data ─────────────────────────────────────────────────
  const stepMap = job ? STAGE_TO_STEP[job.device_type] ?? {} : {}
  const currentStep = job ? stepMap[job.current_stage] ?? 1 : 1
  const isComplete = job ? job.current_stage === getFinalStage(job.device_type) : false

  // First time each customer step was reached
  const stepDates: Record<number, string> = {}
  if (job) {
    ;[...job.stage_history]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach(h => {
        const s = stepMap[h.stage]
        if (s && !stepDates[s]) stepDates[s] = h.created_at
      })
  }

  const timeline = job
    ? CUSTOMER_STEPS.map((s, i) => ({ ...s, step: i + 1, at: stepDates[i + 1] ?? null }))
        .filter(s => s.step <= currentStep)
        .reverse()
    : []

  const current = CUSTOMER_STEPS[currentStep - 1]
  const lastUpdate = job && job.stage_history.length
    ? job.stage_history.reduce((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? a : b)).created_at
    : null
  const progress = Math.round((currentStep / CUSTOMER_STEPS.length) * 100)

  const details = job
    ? [
        { label: 'Job number', value: job.job_no, mono: true },
        { label: 'Device type', value: TYPE_LABELS[job.device_type] },
        { label: 'Serial number', value: job.serial_number, mono: true },
        { label: 'IMEI', value: job.imei, mono: true },
        { label: 'Received on', value: formatDate(job.received_date) },
        { label: 'Received at', value: job.received_branch },
        { label: 'Registered to', value: maskName(job.customer_name) },
      ].filter(d => !!d.value)
    : []

  return (
    <>
      <Head>
        <title>Track your repair — Idealz Lanka</title>
        <meta name="description" content="Track the real-time status of your Idealz Lanka warranty repair." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#e4f4fd" />
      </Head>

      <div className="min-h-screen">
        <header className="sticky top-0 z-20 px-4 pt-4">
          <div className="glass mx-auto flex max-w-xl items-center justify-between rounded-full px-5 py-2.5">
            <div className="flex items-center gap-3">
              <Logo height={30} />
              <span className="h-6 w-px bg-slate-300" aria-hidden="true" />
              <p className="text-xs font-medium text-slate-500">Warranty Tracker</p>
            </div>
            <Link href="/staff/login" className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white/70">
              Staff login
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-xl px-4 pb-16 pt-10 text-[#0B0B0F]">
          <div className="text-center">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Where is my <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">device?</span>
            </h1>
            <p className="mt-3 text-base text-slate-600">Follow your warranty repair step by step, in real time.</p>
          </div>

          <form onSubmit={handleSubmit} className="glass mt-8 rounded-[2rem] p-5 sm:p-6">
            <div role="tablist" aria-label="Search by" className="glass-inset relative mb-5 grid grid-cols-3 rounded-2xl p-1">
              <span
                aria-hidden="true"
                className="glass-pill absolute bottom-1 left-1 top-1 rounded-xl transition-transform duration-300 ease-out"
                style={{ width: 'calc((100% - 0.5rem) / 3)', transform: `translateX(${modeIdx * 100}%)` }}
              />
              {MODES.map(m => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === m.id}
                  onClick={() => { setMode(m.id); setError(''); inputRef.current?.focus() }}
                  className={`relative z-10 py-2 text-sm font-medium transition-colors ${
                    mode === m.id ? 'text-sky-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {m.short}
                </button>
              ))}
            </div>

            <label htmlFor="track-input" className="mb-2 block text-xs font-medium text-slate-500">
              Enter your {activeMode.label.toLowerCase()}
            </label>
            <input
              id="track-input"
              ref={inputRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              inputMode={mode === 'imei' ? 'numeric' : 'text'}
              autoComplete="off"
              spellCheck={false}
              placeholder={activeMode.placeholder}
              className="input mono h-14 text-lg"
            />
            <p className="mt-2 text-xs text-slate-500">{activeMode.hint}</p>

            <button type="submit" disabled={loading} className="btn-primary mt-5 flex h-14 w-full items-center justify-center gap-2 text-base">
              {loading ? (<><Spinner /> Searching…</>) : (<>Track my device <span aria-hidden="true">→</span></>)}
            </button>
          </form>

          {!job && !loading && !error && (
            <ul className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                { t: 'Live updates', d: 'Every step, as it happens' },
                { t: 'Private', d: 'Your details stay protected' },
                { t: 'No login', d: 'Just your job number' },
              ].map(x => (
                <li key={x.t} className="glass rounded-2xl px-2 py-4">
                  <p className="text-sm font-semibold">{x.t}</p>
                  <p className="mt-1 text-xs leading-snug text-slate-500">{x.d}</p>
                </li>
              ))}
            </ul>
          )}

          {loading && (
            <div className="mt-6 animate-pulse space-y-4" aria-hidden="true">
              <div className="glass h-52 rounded-[2rem]" />
              <div className="glass h-32 rounded-[2rem]" />
            </div>
          )}

          {error && !loading && (
            <div role="alert" className="glass mt-6 rounded-[2rem] p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-xl text-sky-700" aria-hidden="true">!</div>
              <p className="font-semibold">{error}</p>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                <li>Check for typing mistakes or extra spaces</li>
                <li>Try a different option: job number, serial or IMEI</li>
                <li>Your job may have been created very recently</li>
              </ul>
            </div>
          )}

          {job && !loading && (
            <div ref={resultRef} className="mt-6 scroll-mt-24 space-y-4" aria-live="polite">
              {/* Status */}
              <section className={`${isComplete ? 'glass-sky' : 'glass-dark'} rounded-[2rem] p-6`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                    {!isComplete && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
                      </span>
                    )}
                    {isComplete ? 'Completed' : 'In progress'}
                  </span>
                  <span className="mono text-xs text-white/70">Job #{job.job_no}</span>
                </div>

                <p className="mt-6 text-xs uppercase tracking-wider text-white/60">Current status</p>
                <h2 className="mt-1 text-2xl font-semibold leading-tight">
                  {isComplete ? 'Device handed over' : current.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/85">
                  {isComplete ? 'Your device has been handed over. Thank you for choosing iDealz.' : current.text}
                </p>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                    <span>Step {currentStep} of {CUSTOMER_STEPS.length}</span>
                    <span>{isComplete ? 'Done' : `${progress}%`}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/20">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isComplete ? 'bg-white' : 'bg-gradient-to-r from-sky-300 to-sky-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {lastUpdate && <p className="mt-3 text-xs text-white/60">Last updated {timeAgo(lastUpdate)}</p>}
                </div>
              </section>

              {/* Device */}
              <section className="glass rounded-[2rem] p-6">
                <h3 className="text-lg font-semibold">{job.model}</h3>
                {(job.color || job.storage) && (
                  <p className="text-sm text-slate-500">{[job.color, job.storage].filter(Boolean).join(' · ')}</p>
                )}
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                  {details.map(d => (
                    <div key={d.label} className="min-w-0">
                      <dt className="text-xs text-slate-500">{d.label}</dt>
                      <dd className={`mt-0.5 truncate text-sm font-medium ${d.mono ? 'mono' : ''}`}>{d.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Timeline */}
              <section className="glass rounded-[2rem] p-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Journey so far</h3>
                <ol className="mt-5">
                  {timeline.map((item, i) => {
                    const isCurrent = item.step === currentStep
                    const last = i === timeline.length - 1
                    return (
                      <li key={item.step} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              isCurrent && !isComplete
                                ? 'bg-gradient-to-b from-[#2b2f3a] to-[#0B0B0F] ring-4 ring-sky-400/30'
                                : 'bg-gradient-to-b from-sky-500 to-sky-700 shadow-md shadow-sky-600/30'
                            }`}
                          >
                            {isCurrent && !isComplete
                              ? <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-300" />
                              : <CheckIcon />}
                          </span>
                          {!last && <span className="my-1 w-0.5 flex-1 rounded-full bg-sky-300/70" style={{ minHeight: 24 }} />}
                        </div>
                        <div className={`min-w-0 flex-1 ${last ? '' : 'pb-6'}`}>
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{item.text}</p>
                          {item.at && (
                            <p className="mt-1 text-xs text-slate-500">{formatDate(item.at)} · {formatTime(item.at)}</p>
                          )}
                          {isCurrent && !isComplete && <p className="mt-1 text-xs font-medium text-sky-700">Happening now</p>}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={shareWhatsApp}
                  className="h-12 rounded-2xl bg-gradient-to-b from-[#25c967] to-[#17a34a] text-sm font-medium text-white shadow-lg shadow-green-700/25 transition-transform active:scale-[0.98]"
                >
                  Share on WhatsApp
                </button>
                <button onClick={copyLink} className="btn-secondary h-12 text-sm">
                  {copied ? 'Link copied ✓' : 'Copy link'}
                </button>
              </div>
              <button onClick={reset} className="w-full py-2 text-sm text-slate-600 underline underline-offset-4 transition-colors hover:text-sky-700">
                Track another device
              </button>
            </div>
          )}

          <section className="glass mt-8 rounded-[2rem] p-6 text-center">
            <p className="text-sm font-semibold">Need help with your repair?</p>
            <p className="mt-1 text-xs text-slate-500">Visit or contact any Idealz branch and quote your job number.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {BRANCHES.map(b => (
                <span key={b} className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">{b}</span>
              ))}
            </div>
          </section>
        </main>

        <footer className="pb-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Idealz Lanka Pvt Ltd
        </footer>
      </div>
    </>
  )
}
