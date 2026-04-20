function UpdateStageModal({ job, token, onClose, onSaved }: { job: Job; token: string; onClose: () => void; onSaved: () => void }) {
  const stages = getStagesForType(job.device_type)
  const currentIdx = getStageIndex(job.device_type, job.current_stage)
  const [stage, setStage] = useState<string>(job.current_stage)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Check if this is the Genext decision point
  const isDecisionPoint = job.device_type === 'genext' && job.current_stage === 'device_received_prime'

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

          {/* Special decision point UI for Genext after device_received_prime */}
          {isDecisionPoint ? (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-3">Device is at Prime — choose the next step:</p>
              <div className="grid grid-cols-1 gap-3 mb-2">
                {/* Option A — Send to Dubai */}
                <button
                  type="button"
                  onClick={() => setStage('sent_to_dubai')}
                  className={`w-full px-4 py-4 rounded-xl border-2 transition-all text-left ${stage === 'sent_to_dubai' ? 'bg-[#0A2240] border-[#0A2240] text-white' : 'bg-white border-slate-200 hover:border-[#0A2240] text-slate-700'}`}
                >
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

                {/* Option B — Hand over directly */}
                <button
                  type="button"
                  onClick={() => setStage('handed_over_customer')}
                  className={`w-full px-4 py-4 rounded-xl border-2 transition-all text-left ${stage === 'handed_over_customer' ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-200 hover:border-green-500 text-slate-700'}`}
                >
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
              </div>
            </div>
          ) : (
            /* Normal stage selector for all other cases */
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
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Note (optional)</label>
            <textarea className="input resize-none" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Tracking number, reason for update..." />
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
