import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, STAGES, getStageIndex } from '../../../../lib/supabase'
import { requireAuth, StaffPayload } from '../../../../lib/auth'

export default requireAuth(async function handler(req: NextApiRequest, res: NextApiResponse, staff: StaffPayload) {
  if (req.method !== 'POST') return res.status(405).end()

  const { id } = req.query
  const { stage, note } = req.body

  if (!stage) return res.status(400).json({ error: 'Stage is required' })

  // Validate stage exists
  const stageInfo = STAGES.find(s => s.key === stage)
  if (!stageInfo) return res.status(400).json({ error: 'Invalid stage' })

  // Get current job
  const { data: job, error: jobError } = await supabaseAdmin
    .from('warranty_jobs')
    .select('current_stage')
    .eq('id', String(id))
    .single()

  if (jobError || !job) return res.status(404).json({ error: 'Job not found' })

  // Ensure stage is moving forward
  const currentIdx = getStageIndex(job.current_stage)
  const newIdx = getStageIndex(stage)
  if (newIdx <= currentIdx) return res.status(400).json({ error: 'Cannot move to a previous stage' })

  // Update job current stage
  const { error: updateError } = await supabaseAdmin
    .from('warranty_jobs')
    .update({ current_stage: stage })
    .eq('id', String(id))

  if (updateError) return res.status(500).json({ error: updateError.message })

  // Log to history
  const { data: history, error: histError } = await supabaseAdmin
    .from('stage_history')
    .insert({
      job_id: String(id),
      stage,
      stage_label: stageInfo.label,
      note: note || null,
      updated_by: staff.id,
      updated_by_name: staff.name,
    })
    .select()
    .single()

  if (histError) return res.status(500).json({ error: histError.message })

  return res.json({ success: true, history })
})
