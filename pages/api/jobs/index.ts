import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, getStagesForType, DeviceType } from '../../../lib/supabase'
import { requireAuth, StaffPayload } from '../../../lib/auth'

export default requireAuth(async function handler(req: NextApiRequest, res: NextApiResponse, staff: StaffPayload) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('warranty_jobs')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'POST') {
    const {
      job_no, device_type, serial_number, imei, customer_name, customer_phone,
      model, color, storage, issue_description, received_date, notes, received_branch
    } = req.body

    if (!job_no || !customer_name || !model || !issue_description || !device_type)
      return res.status(400).json({ error: 'Required fields missing' })

    const { data: existing } = await supabaseAdmin
      .from('warranty_jobs').select('id').eq('job_no', job_no).single()
    if (existing) return res.status(400).json({ error: 'Job number already exists' })

    const firstStage = getStagesForType(device_type as DeviceType)[0]

    const { data: job, error } = await supabaseAdmin
      .from('warranty_jobs')
      .insert({
        job_no,
        device_type,
        serial_number,
        imei,
        customer_name,
        customer_phone,
        model,
        color,
        storage,
        issue_description,
        received_date,
        notes,
        received_branch: received_branch || 'Idealz Prime',
        current_stage: firstStage.key,
        created_by: staff.id,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    await supabaseAdmin.from('stage_history').insert({
      job_id: job.id,
      stage: firstStage.key,
      stage_label: firstStage.label,
      note: `Device received at ${received_branch || 'Idealz Prime'}`,
      updated_by: staff.id,
      updated_by_name: staff.name,
    })

    return res.status(201).json(job)
  }

  return res.status(405).end()
})
