import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { getStagesForType, getStageIndex, getFinalStage, DeviceType } from '../../../lib/supabase'

interface StageHistory {
  id: string; stage: string; stage_label: string; note: string | null
  updated_by_name: string; created_at: string
}

interface Job {
  id: string; job_no: string; device_type: DeviceType; serial_number: string; imei: string
  customer_name: string; customer_phone: string; model: string; color: string; storage: string
  issue_description: string; received_date: string; current_stage: string; notes: string
  received_branch: string; service_charge: number | null; service_charge_paid_by: string | null
  service_charge_paid_date: string | null; service_charge_status: string | null
  stage_history: StageHistory[]
}

const TYPE_LABELS: Record<DeviceType, string> = { apple: 'Apple Device', genext: 'Genext Device', other: 'Other Device' }
const TYPE_COLORS: Record<DeviceType, string> = { apple: '#1D4ED8', genext: '#15803D', other: '#B45309' }

export default function JobDetail() {
  const router = useRouter()
  const { id } = router.query
  const [job, setJob] = useState<Job | null>(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [showUpdate, setShowUpdate] = useState(false)
  const [showDecision, setShowDecision] = useState(false)
  const [stage, setStage] = useState<string>('')
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
    setStage(data.current_stage)
    setShowDecision(data.device_type === 'genext' && data.current_stage === 'device_received_prime')
    setLoading(false)
  }, [token, id, router])

  useEffect(() => { loadJob() }, [loadJob])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await fetch(`/api/jobs/${id}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ stage, note }),
    })
    setSaving(false); setShowUpdate(false); setShowDecision(false); setNote(''); loadJob()
  }

  if (loading) return <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center text-slate-400">Loading...</div>
  if (!job) return <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center text-slate-400">Job not found</div>

  const stages = getStagesForType(job.device_type)
  const currentIdx = getStageIndex(job.device_type, job.current_stage)
  const isComplete = job.current_stage === getFinalStage(job.device_type)

  return (
    <>
      <Head><title>{job.job_no} — Idealz Lanka</title></Head>
      <div className="min-h-screen bg-[#F4F6FA]">
        <nav className="bg-[#0A2240] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/staff/dashboard" className="text-blue-200 hover:text-white text-sm transition-colors">← Dashboard</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white text-sm font-medium">{job.job_no}</span>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: TYPE_COLORS[job.device_type] + '20', color: TYPE_COLORS[job.device_type] }}>{TYPE_LABELS[job.device_type]}</span>
                {isComplete && <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">Completed</span>}
              </div>
              <h1 className="text-base font-semibold text-[#0A2240]">{job.model}</h1>
              {(job.color || job.storage) && <p className="text-xs text-slate-400 mb-3">{[job.color, job.storage].filter(Boolean).join(' · ')}</p>}
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Job No', value: job.job_no, mono: true },
                  { label: 'Branch', value: job.received_branch || 'Idealz Prime' },
                  { label: 'Serial', value: job.serial_number, mono: true },
                  { label: 'IMEI', value: job.imei, mono: true },
                  { label: 'Customer', value: job.customer_name },
                  { label: 'Phone', value: job.customer_phone },
                  { label: 'Received', value: job.received_date ? new Date(job.received_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '' },
                ].filter(r => r.value).map(row => (
                  <div key={row.label} className="flex justify-between gap-2">
                    <span className="text-xs text-slate-400">{row.label}</span>
                    <span className={`text-xs font-medium text-[#0A2240] text-right ${row.mono ? 'mono' : ''}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs font-medium text-slate-400 mb-2">Issue</p>
              <p className="text-sm text-[#0A2240]">{job.issue_description}</p>
              {job.notes && (<><p className="text-xs font-medium text-slate-400 mb-2 mt-3">Notes</p><p className="text-sm text-[#0A2240]">{job.notes}</p></>)}
            </div>

            {job.device_type === 'genext' && job.service_charge && (
              <div className="card p-5" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                <p className="text-xs font-semibold text-green-800 uppercase tracking-wider mb-3">Service Charge</p>
                <p className="text-2xl font-semibold text-green-700 mb-2">LKR {Number(job.service_charge).toLocaleString()}</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Paid by</span>
                    <span className={`font-medium px-2 py-0.5 rounded-full ${job.service_charge_paid_by === 'customer' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {job.service_charge_paid_by === 'customer' ? 'Customer' : 'Shop'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Status</span>
                    <span className={`font-medium px-2 py-0.5 rounded-full ${job.service_charge_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {job.service_charge_status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                  {job.service_charge_paid_date && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Date</span>
                      <span className="text-slate-600">{new Date(job.service_charge_paid_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button onClick={() => setShowUpdate(true)} className="btn-gold w-full">Update Stage</button>
          </div>

          <div className="md:col-span-2 card p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">Activity Timeline</p>
            <div className="relative">
              {stages.map((s, idx) => {
                const isDone = idx <= currentIdx
                const isActive = idx === currentIdx
                const histEntry = job.stage_history.find(h => h.stage === s.key)
                return (
                  <div key={s.key} className="flex gap-4 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${isDone && !isActive ? 'bg-green-500' : isActive ? 'bg-[#0A2240] ring-4 ring-[#0A2240]/20' : 'bg-slate-200'}`}>
                        {isDone && !isActive
                          ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : isActive ? <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                          : <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />}
                      </div>
                      {idx < stages.length - 1 && <div className={`w-0.5 flex-1 mt-1 ${isDone ? 'bg-green-400' : 'bg-slate-200'}`} style={{ minHeight: '24px' }} />}
                    </div>
                    <div className="flex-1 pb-1">
                      <p className={`text-sm font-medium ${idx > currentIdx ? 'text-slate-400' : 'text-[#0A2240]'}`}>{s.label}</p>
                      {histEntry && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(histEntry.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {histEntry.updated_by_name && ` · ${histEntry.updated_by_name}`}
                        </p>
                      )}
                      {histEntry?.note && <div className="mt-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{histEntry.note}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {showUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#0A2240]">Update Stage</h2>
              <button onClick={() => { setShowUpdate(false); setShowDecision(false) }} className="text-slate-400 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              {showDecision ? (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-3">Device is at Prime — choose the next step:</p>
                  <div className="grid grid-cols-1 gap-3">
                    <button type="button" onClick={() => setStage('sent_to_dubai')}
                      className={`w-full px-4 py-4 rounded-xl border-2 transition-all text-left ${stage === 'sent_to_dubai' ? 'bg-[#0A2240] border-[#0A2240] text-white' : 'bg-white border-slate-200 hover:border-[#0A2240] text-slate-700'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${stage === 'sent_to_dubai' ? 'bg-white' : 'bg-blue-100'}`}>
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={stage === 'sent_to_dubai' ? '#0A2240' : '#1D4ED8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Send to Dubai</p>
                          <p className={`text-xs mt-0.5 ${stage === 'sent_to_dubai' ? 'text-blue-200' : 'text-slate-400'}`}>Device needs further work at Apple Mall</p>
                        </div>
                      </div>
                    </button>
                    <button type="button" onClick={() => setStage('handed_over_customer')}
                      className={`w-full px-4 py-4 rounded-xl border-2 transition-all text-left ${stage === 'handed_over_customer' ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-200 hover:border-green-500 text-slate-700'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${stage === 'handed_over_customer' ? 'bg-white' : 'bg-green-100'}`}>
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke={stage === 'handed_over_customer' ? '#16a34a' : '#15803D'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Hand Over to Customer</p>
                          <p className={`text-xs mt-0.5 ${stage === 'handed_over_customer' ? 'text-green-100' : 'text-slate-400'}`}>Repair complete — return device directly</p>
                        </div>
                      </div>
                    </button>
                    <button type="button" onClick={() => setShowDecision(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 text-center pt-1 underline">
                      ← Back to full stage list
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-3">Select Stage</label>
                  <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                    {stages.map((s, idx) => {
                      const isCurrentStage = s.key === job.current_stage
                      const isSelected = s.key === stage
                      const isPast = idx < currentIdx
                      const isDecisionStage = job.device_type === 'genext' && s.key === 'device_received_prime'
                      return (
                        <button key={s.key} type="button"
                          onClick={() => {
                            setStage(s.key)
                            setShowDecision(job.device_type === 'genext' && s.key === 'device_received_prime')
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center gap-3 ${
                            isSelected ? 'bg-[#0A2240] text-white border-[#0A2240]'
                            : isCurrentStage ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : isPast ? 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-[#0A2240] hover:text-[#0A2240]'
                          }`}>
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${isSelected ? 'bg-white text-[#0A2240]' : 'bg-slate-200 text-slate-500'}`}>{idx + 1}</span>
                          <span className="flex-1">{s.label}</span>
                          {isCurrentStage && !isSelected && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Current</span>}
                          {isDecisionStage && !isSelected && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Decision</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Note (optional)</label>
                <textarea className="input resize-none" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Tracking number, reason for update..." />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowUpdate(false); setShowDecision(false) }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
