import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { STAGES, getStageIndex } from '../../lib/supabase'

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
  created_at: string
}

interface Staff {
  id: string
  name: string
  email: string
  role: string
}

export default function Dashboard() {
  const router = useRouter()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [token, setToken] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState<Job | null>(null)
  const [showStaffModal, setShowStaffModal] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('wt_token')
    const s = localStorage.getItem('wt_staff')
    if (!t || !s) { router.push('/staff/login'); return }
    setToken(t)
    setStaff(JSON.parse(s))
  }, [router])

  const loadJobs = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/jobs', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) { router.push('/staff/login'); return }
      const data = await res.json()
      setJobs(data)
    } finally {
      setLoading(false)
    }
  }, [token, router])

  useEffect(() => { loadJobs() }, [loadJobs])

  function logout() {
    localStorage.removeItem('wt_token')
    localStorage.removeItem('wt_staff')
    router.push('/staff/login')
  }

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    const matchSearch = !q || j.job_no.toLowerCase().includes(q) || j.serial_number.toLowerCase().includes(q) ||
      j.imei?.toLowerCase().includes(q) || j.customer_name.toLowerCase().includes(q) || j.model.toLowerCase().includes(q)
    const matchStage = stageFilter === 'all' || j.current_stage === stageFilter
    return matchSearch && matchStage
  })

  const stats = {
    total: jobs.length,
    inProgress: jobs.filter(j => j.current_stage !== 'handed_over').length,
    completed: jobs.filter(j => j.current_stage === 'handed_over').length,
    atDubai: jobs.filter(j => ['sent_to_dubai', 'at_dubai', 'at_apple_mall', 'received_from_apple_mall'].includes(j.current_stage)).length,
  }

  return (
    <>
      <Head><title>Staff Dashboard — Idealz Lanka Warranty</title></Head>
      <div className="min-h-screen bg-[#F4F6FA]">
        {/* Top Nav */}
        <nav className="bg-[#0A2240] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#C8972B' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="text-white font-semibold text-sm">Idealz Lanka — Warranty Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            {staff?.role === 'admin' && (
              <button onClick={() => setShowStaffModal(true)} className="text-blue-200 hover:text-white text-sm transition-colors">Manage Staff</button>
            )}
            <span className="text-blue-300 text-sm">{staff?.name}</span>
            <button onClick={logout} className="text-blue-300 hover:text-white text-sm transition-colors">Sign out</button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Jobs', value: stats.total, color: '#0A2240' },
              { label: 'In Progress', value: stats.inProgress, color: '#1D4ED8' },
              { label: 'At Dubai', value: stats.atDubai, color: '#B45309' },
              { label: 'Completed', value: stats.completed, color: '#15803D' },
            ].map(s => (
              <div key={s.label} className="card p-4">
                <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                <p className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-3 mb-5">
            <input className="input flex-1" placeholder="Search by job no, serial, IMEI, customer, model..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input w-full md:w-56" value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
              <option value="all">All stages</option>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <button onClick={() => setShowAddModal(true)} className="btn-gold whitespace-nowrap">+ New Job</button>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Job No', 'Customer', 'Device', 'Serial / IMEI', 'Received', 'Stage', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No jobs found</td></tr>
                  ) : filtered.map(job => {
                    const stageInfo = STAGES.find(s => s.key === job.current_stage)
                    const isComplete = job.current_stage === 'handed_over'
                    const progress = Math.round(((getStageIndex(job.current_stage) + 1) / STAGES.length) * 100)
                    return (
                      <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium mono text-sm text-[#0A2240]">{job.job_no}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-[#0A2240]">{job.customer_name}</p>
                          {job.customer_phone && <p className="text-xs text-slate-400">{job.customer_phone}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-[#0A2240]">{job.model}</p>
                          {(job.color || job.storage) && <p className="text-xs text-slate-400">{[job.color, job.storage].filter(Boolean).join(' · ')}</p>}
                        </td>
                        <td className="px-4 py-3 mono text-xs text-slate-500">
                          <div>{job.serial_number}</div>
                          {job.imei && <div className="text-slate-400">{job.imei}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(job.received_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 max-w-[80px]">
                              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: isComplete ? '#15803D' : '#0A2240' }} />
                              </div>
                            </div>
                            <span className={`badge text-xs ${isComplete ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {stageInfo?.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link href={`/staff/job/${job.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-800">View</Link>
                            {!isComplete && (
                              <button onClick={() => setShowUpdateModal(job)} className="text-xs font-medium text-[#C8972B] hover:text-[#b08324]">Update</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Job Modal */}
      {showAddModal && (
        <AddJobModal token={token} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadJobs() }} />
      )}

      {/* Update Stage Modal */}
      {showUpdateModal && (
        <UpdateStageModal job={showUpdateModal} token={token} onClose={() => setShowUpdateModal(null)} onSaved={() => { setShowUpdateModal(null); loadJobs() }} />
      )}

      {/* Staff Management Modal */}
      {showStaffModal && (
        <StaffManagementModal token={token} onClose={() => setShowStaffModal(false)} />
      )}
    </>
  )
}

// ─── Add Job Modal ──────────────────────────────────────────────────────────
function AddJobModal({ token, onClose, onSaved }: { token: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    job_no: '', serial_number: '', imei: '', customer_name: '', customer_phone: '',
    model: '', color: '', storage: '', issue_description: '',
    received_date: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      onSaved()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="card w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#0A2240]">New Warranty Job</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Job Number *</label><input className="input" value={form.job_no} onChange={e => set('job_no', e.target.value)} placeholder="JOB-2024-001" required /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Received Date *</label><input type="date" className="input" value={form.received_date} onChange={e => set('received_date', e.target.value)} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Serial Number *</label><input className="input mono" value={form.serial_number} onChange={e => set('serial_number', e.target.value)} placeholder="F2LXQ0ABHG7H" required /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">IMEI</label><input className="input mono" value={form.imei} onChange={e => set('imei', e.target.value)} placeholder="352099001761481" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Customer Name *</label><input className="input" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} required /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Phone</label><input className="input" value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} placeholder="+94 77 123 4567" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Model *</label><input className="input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="iPhone 15 Pro" required /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Color</label><input className="input" value={form.color} onChange={e => set('color', e.target.value)} placeholder="Natural Titanium" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Storage</label><input className="input" value={form.storage} onChange={e => set('storage', e.target.value)} placeholder="256GB" /></div>
          </div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">Issue Description *</label><textarea className="input resize-none" rows={2} value={form.issue_description} onChange={e => set('issue_description', e.target.value)} placeholder="Describe the issue..." required /></div>
          {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Create Job'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Update Stage Modal ─────────────────────────────────────────────────────
function UpdateStageModal({ job, token, onClose, onSaved }: { job: Job; token: string; onClose: () => void; onSaved: () => void }) {
  const currentIdx = getStageIndex(job.current_stage)
  const nextStages = STAGES.slice(currentIdx + 1)
  const [stage, setStage] = useState(nextStages[0]?.key || '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/jobs/${job.id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stage, note }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      onSaved()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-[#0A2240]">Update Stage</h2>
            <p className="text-xs text-slate-400 mt-0.5">{job.job_no} · {job.customer_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">New Stage *</label>
            <select className="input" value={stage} onChange={e => setStage(e.target.value)} required>
              {nextStages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Note (optional)</label>
            <textarea className="input resize-none" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Dispatched via DHL, tracking #123456" />
          </div>
          {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving || !stage} className="btn-primary flex-1">{saving ? 'Saving...' : 'Update Stage'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Staff Management Modal ─────────────────────────────────────────────────
function StaffManagementModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('staff')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch('/api/staff', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setStaffList).finally(() => setLoading(false))
  }, [token])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, email, password, role }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setStaffList(l => [...l, data])
      setName(''); setEmail(''); setPassword(''); setRole('staff')
      setSuccess('Staff member added successfully.')
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#0A2240]">Manage Staff</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {/* Current staff */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Current Staff</p>
          {loading ? <p className="text-sm text-slate-400">Loading...</p> : (
            <div className="space-y-2">
              {staffList.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-[#0A2240]">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.email}</p>
                  </div>
                  <span className={`badge ${s.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{s.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add staff form */}
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Add New Staff</p>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-500 mb-1">Full Name *</label><input className="input" value={name} onChange={e => setName(e.target.value)} required /></div>
            <div><label className="block text-xs text-slate-500 mb-1">Email *</label><input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-500 mb-1">Password *</label><input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
            <div><label className="block text-xs text-slate-500 mb-1">Role</label>
              <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {error && <div className="px-3 py-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>}
          {success && <div className="px-3 py-2 rounded bg-green-50 border border-green-200 text-green-700 text-xs">{success}</div>}
          <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Adding...' : 'Add Staff Member'}</button>
        </form>
      </div>
    </div>
  )
}
