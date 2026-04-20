import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { getStagesForType, getFinalStage, getStageIndex, DeviceType } from '../../lib/supabase'

interface Job {
  id: string; job_no: string; device_type: DeviceType; serial_number: string; imei: string
  customer_name: string; customer_phone: string; model: string; color: string; storage: string
  issue_description: string; received_date: string; current_stage: string; created_at: string
  notes: string; received_branch: string
  service_charge: number | null; service_charge_paid_by: string | null
  service_charge_paid_date: string | null; service_charge_status: string | null
}
interface Staff { id: string; name: string; email: string; role: string }

const TYPE_LABELS: Record<DeviceType, string> = { apple: 'Apple', genext: 'Genext', other: 'Other' }
const TYPE_COLORS: Record<DeviceType, { bg: string; text: string }> = {
  apple:  { bg: '#DBEAFE', text: '#1E40AF' },
  genext: { bg: '#DCFCE7', text: '#166534' },
  other:  { bg: '#FEF3C7', text: '#92400E' },
}
const BRANCHES = ['Idealz Prime', 'Idealz Marino', 'Idealz Liberty Plaza']

export default function Dashboard() {
  const router = useRouter()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [token, setToken] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState<Job | null>(null)
  const [showEditModal, setShowEditModal] = useState<Job | null>(null)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'jobs' | 'summary' | 'charges'>('jobs')

  useEffect(() => {
    const t = localStorage.getItem('wt_token')
    const s = localStorage.getItem('wt_staff')
    if (!t || !s) { router.push('/staff/login'); return }
    setToken(t); setStaff(JSON.parse(s))
  }, [router])

  const loadJobs = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/jobs', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) { router.push('/staff/login'); return }
      setJobs(await res.json())
    } finally { setLoading(false) }
  }, [token, router])

  useEffect(() => { loadJobs() }, [loadJobs])

  function logout() {
    localStorage.removeItem('wt_token'); localStorage.removeItem('wt_staff'); router.push('/staff/login')
  }

  async function deleteJob(id: string) {
    if (!confirm('Delete this job? This cannot be undone.')) return
    await fetch(`/api/jobs/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    loadJobs()
  }

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    const matchSearch = !q || j.job_no.toLowerCase().includes(q) ||
      j.serial_number?.toLowerCase().includes(q) || j.imei?.toLowerCase().includes(q) ||
      j.customer_name.toLowerCase().includes(q) || j.model.toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || j.device_type === typeFilter
    const matchBranch = branchFilter === 'all' || j.received_branch === branchFilter
    return matchSearch && matchType && matchBranch
  })

  const stats = {
    total: jobs.length,
    apple: jobs.filter(j => j.device_type === 'apple').length,
    genext: jobs.filter(j => j.device_type === 'genext').length,
    other: jobs.filter(j => j.device_type === 'other').length,
    inProgress: jobs.filter(j => j.current_stage !== getFinalStage(j.device_type)).length,
    completed: jobs.filter(j => j.current_stage === getFinalStage(j.device_type)).length,
  }

  return (
    <>
      <Head><title>Staff Dashboard — Idealz Lanka</title></Head>
      <div className="min-h-screen bg-[#F4F6FA]">
        <nav className="bg-[#0A2240] px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#C8972B' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="text-white font-semibold text-sm">Idealz Lanka — Warranty Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            {staff?.role === 'admin' && <button onClick={() => setShowStaffModal(true)} className="text-blue-200 hover:text-white text-sm transition-colors">Manage Staff</button>}
            <span className="text-blue-300 text-sm">{staff?.name}</span>
            <button onClick={logout} className="text-blue-300 hover:text-white text-sm transition-colors">Sign out</button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setActiveTab('jobs')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'jobs' ? 'bg-[#0A2240] text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>All Jobs</button>
            <button onClick={() => setActiveTab('summary')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'summary' ? 'bg-[#0A2240] text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>Summary</button>
            <button onClick={() => setActiveTab('charges')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'charges' ? 'bg-[#0A2240] text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>Service Charges</button>
          </div>

          {activeTab === 'summary' ? <SummaryTab jobs={jobs} /> :
           activeTab === 'charges' ? <ServiceChargesTab jobs={jobs} /> : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                {[
                  { label: 'Total', value: stats.total, color: '#0A2240' },
                  { label: 'Apple', value: stats.apple, color: '#1D4ED8' },
                  { label: 'Genext', value: stats.genext, color: '#15803D' },
                  { label: 'Other', value: stats.other, color: '#B45309' },
                  { label: 'In Progress', value: stats.inProgress, color: '#7C3AED' },
                  { label: 'Completed', value: stats.completed, color: '#059669' },
                ].map(s => (
                  <div key={s.label} className="card p-3">
                    <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                    <p className="text-xl font-semibold" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-3 mb-5">
                <input className="input flex-1" placeholder="Search job no, serial, IMEI, customer, model..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input w-full md:w-36" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="all">All types</option>
                  <option value="apple">Apple</option>
                  <option value="genext">Genext</option>
                  <option value="other">Other</option>
                </select>
                <select className="input w-full md:w-48" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                  <option value="all">All branches</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <button onClick={() => setShowAddModal(true)} className="btn-gold whitespace-nowrap">+ New Job</button>
              </div>

              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {['Job No', 'Branch', 'Type', 'Customer', 'Device', 'Serial / IMEI', 'Stage', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Loading...</td></tr>
                      ) : filtered.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No jobs found</td></tr>
                      ) : filtered.map(job => {
                        const stages = getStagesForType(job.device_type)
                        const stageInfo = stages.find(s => s.key === job.current_stage)
                        const isComplete = job.current_stage === getFinalStage(job.device_type)
                        const progress = Math.round(((getStageIndex(job.device_type, job.current_stage) + 1) / stages.length) * 100)
                        const tc = TYPE_COLORS[job.device_type]
                        return (
                          <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium mono text-sm text-[#0A2240]">{job.job_no}</p>
                              {job.device_type === 'genext' && job.service_charge && (
                                <p className="text-xs mt-0.5" style={{ color: job.service_charge_paid_by === 'customer' ? '#15803D' : '#B45309' }}>
                                  LKR {Number(job.service_charge).toLocaleString()} · {job.service_charge_paid_by === 'customer' ? 'Customer' : 'Shop'}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3"><span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full">{job.received_branch || 'Idealz Prime'}</span></td>
                            <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: tc.bg, color: tc.text }}>{TYPE_LABELS[job.device_type]}</span></td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-[#0A2240]">{job.customer_name}</p>
                              {job.customer_phone && <p className="text-xs text-slate-400">{job.customer_phone}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-[#0A2240]">{job.model}</p>
                              {(job.color || job.storage) && <p className="text-xs text-slate-400">{[job.color, job.storage].filter(Boolean).join(' · ')}</p>}
                            </td>
                            <td className="px-4 py-3 mono text-xs text-slate-500">
                              <div>{job.serial_number || '—'}</div>
                              {job.imei && <div className="text-slate-400">{job.imei}</div>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 max-w-[60px]"><div className="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${progress}%`, background: isComplete ? '#15803D' : '#0A2240' }} /></div></div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isComplete ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{stageInfo?.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Link href={`/staff/job/${job.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-800">View</Link>
                                <button onClick={() => setShowEditModal(job)} className="text-xs font-medium text-slate-500 hover:text-slate-700">Edit</button>
                                <button onClick={() => setShowUpdateModal(job)} className="text-xs font-medium text-[#C8972B] hover:text-[#b08324]">Update</button>
                                <button onClick={() => deleteJob(job.id)} className="text-xs font-medium text-red-400 hover:text-red-600">Delete</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showAddModal && <AddJobModal token={token} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadJobs() }} />}
      {showUpdateModal && <UpdateStageModal job={showUpdateModal} token={token} onClose={() => setShowUpdateModal(null)} onSaved={() => { setShowUpdateModal(null); loadJobs() }} />}
      {showEditModal && <EditJobModal job={showEditModal} token={token} onClose={() => setShowEditModal(null)} onSaved={() => { setShowEditModal(null); loadJobs() }} />}
      {showStaffModal && <StaffManagementModal token={token} onClose={() => setShowStaffModal(false)} />}
    </>
  )
}

// ─── Service Charges Tab ────────────────────────────────────────────────────
function ServiceChargesTab({ jobs }: { jobs: Job[] }) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [paidByFilter, setPaidByFilter] = useState('all')

  const genextJobs = jobs.filter(j => j.device_type === 'genext' && j.service_charge)

  const filtered = genextJobs.filter(j => {
    const matchPaidBy = paidByFilter === 'all' || j.service_charge_paid_by === paidByFilter
    const jobDate = j.service_charge_paid_date || j.received_date
    const matchFrom = !dateFrom || jobDate >= dateFrom
    const matchTo = !dateTo || jobDate <= dateTo
    return matchPaidBy && matchFrom && matchTo
  })

  const sorted = [...filtered].sort((a, b) => {
    const da = a.service_charge_paid_date || a.received_date
    const db = b.service_charge_paid_date || b.received_date
    return db.localeCompare(da)
  })

  const totalCustomer = filtered.filter(j => j.service_charge_paid_by === 'customer').reduce((s, j) => s + Number(j.service_charge), 0)
  const totalShop = filtered.filter(j => j.service_charge_paid_by === 'shop').reduce((s, j) => s + Number(j.service_charge), 0)
  const totalAll = filtered.reduce((s, j) => s + Number(j.service_charge), 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-400 mb-1">Total Charges</p>
          <p className="text-2xl font-semibold text-[#0A2240]">LKR {totalAll.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{filtered.length} jobs</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400 mb-1">Paid by Customer</p>
          <p className="text-2xl font-semibold text-green-700">LKR {totalCustomer.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{filtered.filter(j => j.service_charge_paid_by === 'customer').length} jobs</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400 mb-1">Paid by Shop</p>
          <p className="text-2xl font-semibold text-amber-700">LKR {totalShop.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{filtered.filter(j => j.service_charge_paid_by === 'shop').length} jobs</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">From</label>
          <input type="date" className="input w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">To</label>
          <input type="date" className="input w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <select className="input w-full md:w-44" value={paidByFilter} onChange={e => setPaidByFilter(e.target.value)}>
          <option value="all">All payments</option>
          <option value="customer">Paid by Customer</option>
          <option value="shop">Paid by Shop</option>
        </select>
        {(dateFrom || dateTo || paidByFilter !== 'all') && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setPaidByFilter('all') }} className="btn-secondary whitespace-nowrap">Clear filters</button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Date', 'Job No', 'Customer', 'Device', 'Branch', 'Amount (LKR)', 'Paid By', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No service charges found</td></tr>
              ) : sorted.map(job => (
                <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {job.service_charge_paid_date
                      ? new Date(job.service_charge_paid_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : new Date(job.received_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 font-medium mono text-sm text-[#0A2240]">{job.job_no}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[#0A2240]">{job.customer_name}</p>
                    {job.customer_phone && <p className="text-xs text-slate-400">{job.customer_phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-[#0A2240]">{job.model}</p>
                    {(job.color || job.storage) && <p className="text-xs text-slate-400">{[job.color, job.storage].filter(Boolean).join(' · ')}</p>}
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full">{job.received_branch || 'Idealz Prime'}</span></td>
                  <td className="px-4 py-3 font-semibold text-[#0A2240]">{Number(job.service_charge).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${job.service_charge_paid_by === 'customer' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {job.service_charge_paid_by === 'customer' ? 'Customer' : 'Shop'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${job.service_charge_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {job.service_charge_status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Summary Tab ────────────────────────────────────────────────────────────
function SummaryTab({ jobs }: { jobs: Job[] }) {
  const types: DeviceType[] = ['apple', 'genext', 'other']
  const typeLabels: Record<DeviceType, string> = { apple: 'Apple Devices', genext: 'Genext Devices', other: 'Other Devices' }
  const typeColors: Record<DeviceType, string> = { apple: '#1D4ED8', genext: '#15803D', other: '#B45309' }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Jobs', value: jobs.length },
          { label: 'In Progress', value: jobs.filter(j => j.current_stage !== getFinalStage(j.device_type)).length },
          { label: 'Completed', value: jobs.filter(j => j.current_stage === getFinalStage(j.device_type)).length },
          { label: 'This Month', value: jobs.filter(j => new Date(j.created_at).getMonth() === new Date().getMonth()).length },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className="text-3xl font-semibold text-[#0A2240]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-[#0A2240]">By Branch</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {BRANCHES.map(branch => {
            const branchJobs = jobs.filter(j => (j.received_branch || 'Idealz Prime') === branch)
            return (
              <div key={branch} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm font-medium text-[#0A2240] mb-3">{branch}</p>
                <p className="text-3xl font-semibold text-[#0A2240] mb-1">{branchJobs.length}</p>
                <p className="text-xs text-slate-400">total jobs</p>
                <div className="flex gap-3 mt-3 text-xs">
                  <span className="text-blue-600 font-medium">{branchJobs.filter(j => j.current_stage !== getFinalStage(j.device_type)).length} in progress</span>
                  <span className="text-green-600 font-medium">{branchJobs.filter(j => j.current_stage === getFinalStage(j.device_type)).length} done</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {types.map(type => {
        const typeJobs = jobs.filter(j => j.device_type === type)
        const stages = getStagesForType(type)
        return (
          <div key={type} className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ background: typeColors[type] }} />
                <h3 className="font-semibold text-[#0A2240]">{typeLabels[type]}</h3>
                <span className="text-xs text-slate-400">{typeJobs.length} total</span>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-green-600 font-medium">{typeJobs.filter(j => j.current_stage === getFinalStage(type)).length} completed</span>
                <span className="text-blue-600 font-medium">{typeJobs.filter(j => j.current_stage !== getFinalStage(type)).length} in progress</span>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {stages.map(stage => {
                  const count = typeJobs.filter(j => j.current_stage === stage.key).length
                  return (
                    <div key={stage.key} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <p className="text-xs text-slate-500 mb-1 leading-tight">{stage.label}</p>
                      <p className="text-2xl font-semibold" style={{ color: count > 0 ? typeColors[type] : '#94a3b8' }}>{count}</p>
                    </div>
                  )
                })}
              </div>
            </div>
            {typeJobs.length > 0 && (
              <div className="px-5 pb-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Jobs</p>
                <div className="space-y-2">
                  {typeJobs.slice(0, 5).map(job => {
                    const stageLabel = stages.find(s => s.key === job.current_stage)?.label
                    const isComplete = job.current_stage === getFinalStage(type)
                    return (
                      <div key={job.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-xs font-medium mono text-[#0A2240]">{job.job_no}</span>
                          <span className="text-xs text-slate-400 ml-2">{job.customer_name} · {job.model}</span>
                          <span className="text-xs text-slate-300 ml-1">· {job.received_branch || 'Idealz Prime'}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isComplete ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{stageLabel}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Add Job Modal ──────────────────────────────────────────────────────────
function AddJobModal({ token, onClose, onSaved }: { token: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    job_no: '', device_type: 'apple' as DeviceType, serial_number: '', imei: '',
    customer_name: '', customer_phone: '', model: '', color: '', storage: '',
    issue_description: '', notes: '', received_date: new Date().toISOString().split('T')[0],
    received_branch: 'Idealz Prime',
    service_charge: '', service_charge_paid_by: 'customer',
    service_charge_paid_date: new Date().toISOString().split('T')[0],
    service_charge_status: 'pending',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        service_charge: form.device_type === 'genext' && form.service_charge ? parseFloat(form.service_charge) : null,
        service_charge_paid_by: form.device_type === 'genext' && form.service_charge ? form.service_charge_paid_by : null,
        service_charge_paid_date: form.device_type === 'genext' && form.service_charge ? form.service_charge_paid_date : null,
        service_charge_status: form.device_type === 'genext' && form.service_charge ? form.service_charge_status : null,
      }
      const res = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      onSaved()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="card w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#0A2240]">New Warranty Job</h2>
          <button onClick={onClose} className="text-slate-400 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Job Number *</label><input className="input" value={form.job_no} onChange={e => set('job_no', e.target.value)} placeholder="JOB-001" required /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Device Type *</label>
              <select className="input" value={form.device_type} onChange={e => set('device_type', e.target.value)} required>
                <option value="apple">Apple Device</option>
                <option value="genext">Genext Device</option>
                <option value="other">Other Device</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Received From Branch *</label>
            <div className="grid grid-cols-3 gap-2">
              {BRANCHES.map(branch => (
                <button key={branch} type="button" onClick={() => set('received_branch', branch)}
                  className={`py-2.5 px-3 rounded-lg text-xs font-medium border transition-all text-center ${form.received_branch === branch ? 'bg-[#0A2240] text-white border-[#0A2240]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#0A2240] hover:text-[#0A2240]'}`}>
                  {branch}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Serial Number</label><input className="input mono" value={form.serial_number} onChange={e => set('serial_number', e.target.value)} placeholder="F2LXQ0ABHG7H" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">IMEI</label><input className="input mono" value={form.imei} onChange={e => set('imei', e.target.value)} placeholder="352099001761481" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Customer Name *</label><input className="input" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} required /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Phone</label><input className="input" value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} placeholder="+94 77 123 4567" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Model *</label><input className="input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="Samsung S24" required /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Color</label><input className="input" value={form.color} onChange={e => set('color', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Storage</label><input className="input" value={form.storage} onChange={e => set('storage', e.target.value)} placeholder="256GB" /></div>
          </div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">Issue Description *</label><textarea className="input resize-none" rows={2} value={form.issue_description} onChange={e => set('issue_description', e.target.value)} required /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">Received Date</label><input type="date" className="input" value={form.received_date} onChange={e => set('received_date', e.target.value)} /></div>

          {form.device_type === 'genext' && (
            <div className="border border-green-200 rounded-xl p-4 bg-green-50 space-y-3">
              <p className="text-xs font-semibold text-green-800 uppercase tracking-wider">Genext Service Charge</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Amount (LKR)</label>
                  <input className="input" type="number" placeholder="e.g. 5000" value={form.service_charge} onChange={e => set('service_charge', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Payment Date</label>
                  <input type="date" className="input" value={form.service_charge_paid_date} onChange={e => set('service_charge_paid_date', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Paid By</label>
                  <div className="flex gap-2">
                    {[{ val: 'customer', label: 'Customer' }, { val: 'shop', label: 'Shop' }].map(opt => (
                      <button key={opt.val} type="button" onClick={() => set('service_charge_paid_by', opt.val)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${form.service_charge_paid_by === opt.val ? 'bg-[#0A2240] text-white border-[#0A2240]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#0A2240]'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Status</label>
                  <div className="flex gap-2">
                    {[{ val: 'paid', label: 'Paid' }, { val: 'pending', label: 'Pending' }].map(opt => (
                      <button key={opt.val} type="button" onClick={() => set('service_charge_status', opt.val)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${form.service_charge_status === opt.val ? opt.val === 'paid' ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400">Leave amount empty if no service charge applies.</p>
            </div>
          )}

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

// ─── Edit Job Modal ─────────────────────────────────────────────────────────
function EditJobModal({ job, token, onClose, onSaved }: { job: Job; token: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    serial_number: job.serial_number || '', imei: job.imei || '',
    customer_name: job.customer_name, customer_phone: job.customer_phone || '',
    model: job.model, color: job.color || '', storage: job.storage || '',
    issue_description: job.issue_description, notes: job.notes || '',
    received_date: job.received_date, received_branch: job.received_branch || 'Idealz Prime',
    service_charge: job.service_charge ? String(job.service_charge) : '',
    service_charge_paid_by: job.service_charge_paid_by || 'customer',
    service_charge_paid_date: job.service_charge_paid_date || new Date().toISOString().split('T')[0],
    service_charge_status: job.service_charge_status || 'pending',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        service_charge: form.service_charge ? parseFloat(form.service_charge) : null,
        service_charge_paid_by: form.service_charge ? form.service_charge_paid_by : null,
        service_charge_paid_date: form.service_charge ? form.service_charge_paid_date : null,
        service_charge_status: form.service_charge ? form.service_charge_status : null,
      }
      const res = await fetch(`/api/jobs/${job.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      onSaved()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="card w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div><h2 className="text-base font-semibold text-[#0A2240]">Edit Job</h2><p className="text-xs text-slate-400">{job.job_no}</p></div>
          <button onClick={onClose} className="text-slate-400 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Received From Branch *</label>
            <div className="grid grid-cols-3 gap-2">
              {BRANCHES.map(branch => (
                <button key={branch} type="button" onClick={() => set('received_branch', branch)}
                  className={`py-2.5 px-3 rounded-lg text-xs font-medium border transition-all text-center ${form.received_branch === branch ? 'bg-[#0A2240] text-white border-[#0A2240]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#0A2240] hover:text-[#0A2240]'}`}>
                  {branch}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Serial Number</label><input className="input mono" value={form.serial_number} onChange={e => set('serial_number', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">IMEI</label><input className="input mono" value={form.imei} onChange={e => set('imei', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Customer Name *</label><input className="input" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} required /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Phone</label><input className="input" value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Model *</label><input className="input" value={form.model} onChange={e => set('model', e.target.value)} required /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Color</label><input className="input" value={form.color} onChange={e => set('color', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Storage</label><input className="input" value={form.storage} onChange={e => set('storage', e.target.value)} /></div>
          </div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">Issue Description *</label><textarea className="input resize-none" rows={2} value={form.issue_description} onChange={e => set('issue_description', e.target.value)} required /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1">Received Date</label><input type="date" className="input" value={form.received_date} onChange={e => set('received_date', e.target.value)} /></div>

          {job.device_type === 'genext' && (
            <div className="border border-green-200 rounded-xl p-4 bg-green-50 space-y-3">
              <p className="text-xs font-semibold text-green-800 uppercase tracking-wider">Genext Service Charge</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Amount (LKR)</label>
                  <input className="input" type="number" placeholder="e.g. 5000" value={form.service_charge} onChange={e => set('service_charge', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Payment Date</label>
                  <input type="date" className="input" value={form.service_charge_paid_date} onChange={e => set('service_charge_paid_date', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Paid By</label>
                  <div className="flex gap-2">
                    {[{ val: 'customer', label: 'Customer' }, { val: 'shop', label: 'Shop' }].map(opt => (
                      <button key={opt.val} type="button" onClick={() => set('service_charge_paid_by', opt.val)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${form.service_charge_paid_by === opt.val ? 'bg-[#0A2240] text-white border-[#0A2240]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#0A2240]'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Status</label>
                  <div className="flex gap-2">
                    {[{ val: 'paid', label: 'Paid' }, { val: 'pending', label: 'Pending' }].map(opt => (
                      <button key={opt.val} type="button" onClick={() => set('service_charge_status', opt.val)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${form.service_charge_status === opt.val ? opt.val === 'paid' ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Update Stage Modal ─────────────────────────────────────────────────────
function UpdateStageModal({ job, token, onClose, onSaved }: { job: Job; token: string; onClose: () => void; onSaved: () => void }) {
  const stages = getStagesForType(job.device_type)
  const currentIdx = getStageIndex(job.device_type, job.current_stage)
  const [stage, setStage] = useState<string>(job.current_stage)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
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
            <p className="text-xs text-slate-400">{job.job_no} · {job.customer_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-3">Select Stage</label>
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {stages.map((s, idx) => {
                const isCurrentStage = s.key === job.current_stage
                const isSelected = s.key === stage
                const isPast = idx < currentIdx
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStage(s.key)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-[#0A2240] text-white border-[#0A2240]'
                        : isCurrentStage
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : isPast
                        ? 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-[#0A2240] hover:text-[#0A2240]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${isSelected ? 'bg-white text-[#0A2240]' : 'bg-slate-200 text-slate-500'}`}>{idx + 1}</span>
                    <span className="flex-1">{s.label}</span>
                    {isCurrentStage && !isSelected && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Current</span>}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Note (optional)</label>
            <textarea className="input resize-none" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Tracking number, reason for update..." />
          </div>
          {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Update Stage'}</button>
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
  const [name, setName] = useState(''); const [email, setEmail] = useState('')
  const [password, setPassword] = useState(''); const [role, setRole] = useState('staff')
  const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch('/api/staff', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setStaffList).finally(() => setLoading(false))
  }, [token])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, email, password, role }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setStaffList(l => [...l, data]); setName(''); setEmail(''); setPassword(''); setRole('staff')
      setSuccess('Staff member added.')
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#0A2240]">Manage Staff</h2>
          <button onClick={onClose} className="text-slate-400 text-xl leading-none">×</button>
        </div>
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Current Staff</p>
          {loading ? <p className="text-sm text-slate-400">Loading...</p> : (
            <div className="space-y-2">
              {staffList.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div><p className="text-sm font-medium text-[#0A2240]">{s.name}</p><p className="text-xs text-slate-400">{s.email}</p></div>
                  <span className={`badge ${s.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{s.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
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
