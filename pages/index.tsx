import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { getStagesForType, getFinalStage, DeviceType } from '../lib/supabase'

interface StageHistory {
  stage: string; stage_label: string; note: string | null; updated_by_name: string; created_at: string
}
interface Job {
  job_no: string; serial_number: string; imei: string; customer_name: string
  model: string; color: string; storage: string; issue_description: string
  received_date: string; current_stage: string; device_type: DeviceType; stage_history: StageHistory[]
}

const TYPE_LABELS: Record<DeviceType, string> = { apple: 'Apple Device', genext: 'Genext Device', other: 'Other Device' }
const TYPE_COLORS: Record<DeviceType, string> = { apple: '#1D4ED8', genext: '#15803D', other: '#B45309' }

export default function TrackPage() {
  const [serial, setSerial] = useState('')
  const [imei, setImei] = useState('')
  const [jobNo, setJobNo] = useState('')
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!serial.trim() && !imei.trim() && !jobNo.trim()) { setError('Please enter at least one field.'); return }
    setLoading(true); setError(''); setJob(null)
    try {
      const params = new URLSearchParams()
      if (serial.trim()) params.set('serial', serial.trim())
      if (imei.trim()) params.set('imei', imei.trim())
      if (jobNo.trim()) params.set('job_no', jobNo.trim())
      const res = await fetch(`/api/track?${params}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Not found'); return }
      setJob(data)
    } catch { setError('Network error. Please try again.') } finally { setLoading(false) }
  }

  const stages = job ? getStagesForType(job.device_type) : []
  const currentIdx = job ? stages.findIndex(s => s.key === job.current_stage) : -1
  const isComplete = job ? job.current_stage === getFinalStage(job.device_type) : false

  return (
    <>
      <Head><title>Warranty Tracker — Idealz Lanka</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0A2240 0%, #1A3A5C 50%, #0A2240 100%)' }}>
        <header className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#C8972B' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div><div className="text-white font-semibold text-sm">Idealz Lanka</div><div className="text-blue-200 text-xs">Warranty Tracker</div></div>
          </div>
          <Link href="/staff/login" className="text-blue-200 hover:text-white text-sm transition-colors">Staff Login →</Link>
        </header>

        <div className="max-w-2xl mx-auto px-6 pt-8 pb-16 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-white mb-3">Warranty Status Tracker</h1>
          <p className="text-blue-200 text-base mb-8">Enter your device details to see the real-time repair status.</p>
          <form onSubmit={handleSearch} className="card p-6 text-left shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Serial Number</label><input className="input mono" value={serial} onChange={e => setSerial(e.target.value)} placeholder="e.g. F2LXQ0ABHG7H" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1.5">IMEI Number</label><input className="input mono" value={imei} onChange={e => setImei(e.target.value)} placeholder="15-digit IMEI" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Job Number</label><input className="input mono" value={jobNo} onChange={e => setJobNo(e.target.value)} placeholder="e.g. JOB-001" /></div>
            </div>
            {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Searching...' : 'Track My Device'}</button>
          </form>
        </div>

        {job && (
          <div className="max-w-2xl mx-auto px-6 pb-20">
            <div className="card shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100" style={{ background: isComplete ? '#f0fdf4' : '#f8fafc' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-medium text-slate-500 mono">Job #{job.job_no}</span>
                      <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: TYPE_COLORS[job.device_type] + '20', color: TYPE_COLORS[job.device_type] }}>{TYPE_LABELS[job.device_type]}</span>
                      <span className={`badge ${isComplete ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{isComplete ? '✓ Completed' : '● In Progress'}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-[#0A2240]">{job.model}</h2>
                    {(job.color || job.storage) && <p className="text-sm text-slate-500">{[job.color, job.storage].filter(Boolean).join(' · ')}</p>}
                  </div>
                  <div className="text-right shrink-0"><p className="text-xs text-slate-400">Customer</p><p className="text-sm font-medium text-[#0A2240]">{job.customer_name}</p></div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {job.serial_number && <div className="bg-white rounded-lg px-3 py-2 border border-slate-200"><p className="text-xs text-slate-400">Serial</p><p className="text-xs font-medium mono text-[#0A2240] truncate">{job.serial_number}</p></div>}
                  {job.imei && <div className="bg-white rounded-lg px-3 py-2 border border-slate-200"><p className="text-xs text-slate-400">IMEI</p><p className="text-xs font-medium mono text-[#0A2240] truncate">{job.imei}</p></div>}
                  <div className="bg-white rounded-lg px-3 py-2 border border-slate-200"><p className="text-xs text-slate-400">Received</p><p className="text-xs font-medium text-[#0A2240]">{new Date(job.received_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Warranty Journey</p>
                <div className="relative">
                  {stages.map((stage, idx) => {
                    const isDone = idx <= currentIdx
                    const isActive = idx === currentIdx
                    const historyEntry = job.stage_history.find(h => h.stage === stage.key)
                    return (
                      <div key={stage.key} className="flex gap-4 pb-6 last:pb-0">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${isDone && !isActive ? 'bg-green-500' : isActive ? 'bg-[#0A2240] ring-4 ring-[#0A2240]/20' : 'bg-slate-200'}`}>
                            {isDone && !isActive ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              : isActive ? <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                              : <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />}
                          </div>
                          {idx < stages.length - 1 && <div className={`w-0.5 flex-1 mt-1 ${isDone ? 'bg-green-400' : 'bg-slate-200'}`} style={{ minHeight: '20px' }} />}
                        </div>
                        <div className="flex-1 pb-1">
                          <p className={`text-sm font-medium ${idx > currentIdx ? 'text-slate-400' : 'text-[#0A2240]'}`}>{stage.label}</p>
                          {historyEntry && <p className="text-xs text-slate-400 mt-0.5">{new Date(historyEntry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}{historyEntry.updated_by_name && ` · ${historyEntry.updated_by_name}`}</p>}
                          {historyEntry?.note && <div className="mt-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{historyEntry.note}</div>}
                          {isActive && !historyEntry?.note && <p className="text-xs text-blue-500 mt-0.5">Current status</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        <footer className="text-center pb-10 text-blue-300 text-xs">© {new Date().getFullYear()} Idealz Lanka Pvt Ltd</footer>
      </div>
    </>
  )
}
