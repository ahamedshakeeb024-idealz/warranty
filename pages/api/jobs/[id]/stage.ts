import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, getStagesForType, getStageIndex, DeviceType } from '../../../../lib/supabase'
import { requireAuth, StaffPayload } from '../../../../lib/auth'

export default requireAuth(async function handler(req: NextApiRequest, res: NextApiResponse, staff: StaffPayload) {
  if (req.method !== 'POST') return res.status(405).end()
  const { id } = req.query
  const { stage, note } = req.body
  if (!stage) return res.status(400).json({ error: 'Stage is required' })

  const { data: job, error: jobError } = await supabaseAdmin
    .from('warranty_jobs')
    .select('current_stage, device_type')
    .eq('id', String(id))
    .single()

  if (jobError || !job) return res.status(404).json({ error: 'Job not found' })

  const stages = getStagesForType(job.device_type as DeviceType)
  const stageInfo = stages.find(s => s.key === stage)
  if (!stageInfo) return res.status(400).json({ error: 'Invalid stage' })

  if (getStageIndex(job.device_type as DeviceType, stage) <= getStageIndex(job.device_type as DeviceType, job.current_stage))
    return res.status(400).json({ error: 'Cannot move to a previous stage' })

  await supabaseAdmin
    .from('warranty_jobs')
    .update({ current_stage: stage })
    .eq('id', String(id))

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
