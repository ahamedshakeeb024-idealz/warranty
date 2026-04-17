import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
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
    const { job_no, serial_number, imei, customer_name, customer_phone, model, color, storage, issue_description, received_date } = req.body

    if (!job_no || !serial_number || !customer_name || !model || !issue_description) {
      return res.status(400).json({ error: 'Required fields missing' })
    }

    // Check duplicate job_no
    const { data: existing } = await supabaseAdmin.from('warranty_jobs').select('id').eq('job_no', job_no).single()
    if (existing) return res.status(400).json({ error: 'Job number already exists' })

    const { data: job, error } = await supabaseAdmin
      .from('warranty_jobs')
      .insert({ job_no, serial_number, imei, customer_name, customer_phone, model, color, storage, issue_description, received_date, current_stage: 'received', created_by: staff.id })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Log initial stage
    await supabaseAdmin.from('stage_history').insert({
      job_id: job.id,
      stage: 'received',
      stage_label: 'Device Received',
      note: 'Device received at Idealz Lanka',
      updated_by: staff.id,
      updated_by_name: staff.name,
    })

    return res.status(201).json(job)
  }

  return res.status(405).end()
})
