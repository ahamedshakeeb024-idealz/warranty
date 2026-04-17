import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { STAGES, getStageIndex } from '../../../lib/supabase'

interface StageHistory {
  id: string
  stage: string
  stage_label: string
  note: string | null
  updated_by_name: string
  created_at: string
}

interface Job {
  id: string
  job_no: string
  serial_number: string
  imei: string
  customer_name: string
  customer_phone: string
  model: string
  color: string
  storage: string
  issue_description: string
  received_date: string
  current_stage: string
  stage_history: StageHistory[]
}

export default function JobDetail() {
  const router = useRouter()
  const { id } = router.query
  const [job, setJob] = useState<Job | null>(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [showUpdate, setShowUpdate] = useState(false)
  const [stage, setStage] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('wt_token')
    if (!t) { router.push('/staff/login'); return }
    setToken(t)
  }, [router])

  const loadJob = useCallback(async () => {
    if (!token || !id) return
    const res = await fetch(`/api/jobs/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 401) { router.push('/staff/login'); return }
    const data = await res.json()
    setJob(data)
    const currentIdx = getStageIndex(data.current_stage)
    const next = STAGES[currentIdx + 1]
    if (next) setStage(next.key)
    setLoading(false)
  }, [token, id, router])

  useEffect(() => { loadJob() }, [loadJob])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/jobs/${id}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ stage, note }),
    })
    setSaving(false)
    setShowUpdate(false)
    setNote('')
    loadJob()
  }

  if (loading) return <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center text-slate-400">Loading...</div>
  if (!job) return <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center text-slate-400">Job not found</div>

  const currentIdx = getStageIndex(job.current_stage)
  const isComplete = job.current_stage === 'handed_over'
  const nextStages = STAGES.slice(currentIdx + 1)

  return (
    <>
      <Head><title>{job.job_no} — Idealz Lanka Warranty</title></Head>
      <div className="min-h-screen bg-[#F4F6FA]">
        <nav className="bg-[#0A2240] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/staff/dashboard" className="text-blue-200 hover:text-white text-sm transition-colors">← Dashboard</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white text-sm font-medium">{job.job_no}</span>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left — device info */}
          <div className="md:col-span-1 space-y-4">
            <div className="card p-5">
              <div className="w-10 h-10 rounded-xl bg-[#0A2240] flex items-center justify-center mb-4">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" stroke="white" strokeWidth="1.5"/><circle cx="12" cy="17" r="1" fill="white"/></svg>
              </div>
              <h1 className="text-base font-semibold text-[#0A2240]">{job.model}</h1>
              {(job.color || job.storage) && <p className="text-xs text-slate-400">{[job.color, job.storage].filter(Boolean).join(' · ')}</p>}

              <div className="mt-4 space-y-2.5 text-sm">
                {[
                  { label: 'Job No', value: job.job_no, mono: true },
                  { label: 'Serial', value: job.serial_number, mono: true },
                  { label: 'IMEI', value: job.imei, mono: true },
                  { label: 'Customer', value: job.customer_name },
                  { label: 'Phone', value: job.customer_phone },
                  { label: 'Received', value: new Date(job.received_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
                ].filter(r => r.value).map(row => (
                  <div key={row.label} className="flex justify-between gap-2">
                    <span className="text-xs text-slate-400">{row.label}</span>
                    <span className={`text-xs font-medium text-[#0A2240] text-right ${row.mono ? 'mono' : ''}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs font-medium text-slate-400 mb-2">Issue Reported</p>
              <p className="text-sm text-[#0A2240]">{job.issue_description}</p>
            </div>

            {!isComplete && nextStages.length > 0 && (
              <button onClick={() => setShowUpdate(true)} className="btn-gold w-full">Update Stage</button>
            )}
            {isComplete && (
              <div className="card p-4 text-center">
                <div className="text-green-600 font-semibold text-sm">✓ Job Completed</div>
                <p className="text-xs text-slate-400 mt-1">Device handed over to customer</p>
              </div>
            )}
          </div>

          {/* Right — timeline */}
          <div className="md:col-span-2 card p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">Activity Timeline</p>
            <div className="relative">
              {STAGES.map((s, idx) => {
                const isDone = idx <= currentIdx
                const isActive = idx === currentIdx
                const histEntry = job.stage_history.find(h => h.stage === s.key)
                return (
                  <div key={s.key} className="flex gap-4 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${isDone && !isActive ? 'bg-green-500' : isActive ? 'bg-[#0A2240] ring-4 ring-[#0A2240]/20' : 'bg-slate-200'}`}>
                        {isDone && !isActive ? (
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ) : isActive ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        )}
                      </div>
                      {idx < STAGES.length - 1 && <div className={`w-0.5 flex-1 mt-1 ${isDone ? 'bg-green-400' : 'bg-slate-200'}`} style={{ minHeight: '24px' }} />}
                    </div>
                    <div className="flex-1 pb-1">
                      <p className={`text-sm font-medium ${idx > currentIdx ? 'text-slate-400' : 'text-[#0A2240]'}`}>{s.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.description}</p>
                      {histEntry && (
                        <div className="mt-1.5">
                          <span className="text-xs text-slate-400">
                            {new Date(histEntry.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {histEntry.updated_by_name && ` · Updated by ${histEntry.updated_by_name}`}
                          </span>
                          {histEntry.note && (
                            <div className="mt-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{histEntry.note}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Update modal */}
      {showUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#0A2240]">Update Stage</h2>
              <button onClick={() => setShowUpdate(false)} className="text-slate-400 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">New Stage</label>
                <select className="input" value={stage} onChange={e => setStage(e.target.value)}>
                  {nextStages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Note (optional)</label>
                <textarea className="input resize-none" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Tracking number, notes, etc." />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowUpdate(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
