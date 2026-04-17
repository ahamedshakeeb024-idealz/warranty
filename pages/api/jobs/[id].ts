import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth, StaffPayload } from '../../../lib/auth'

export default requireAuth(async function handler(req: NextApiRequest, res: NextApiResponse, _staff: StaffPayload) {
  const { id } = req.query

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('warranty_jobs')
      .select('*, stage_history(*)')
      .eq('id', String(id))
      .single()

    if (error || !data) return res.status(404).json({ error: 'Job not found' })

    if (data.stage_history) {
      data.stage_history.sort((a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }

    return res.json(data)
  }

  if (req.method === 'PUT') {
    const {
      serial_number, imei, customer_name, customer_phone, model,
      color, storage, issue_description, received_date, notes, received_branch
    } = req.body

    const { data, error } = await supabaseAdmin
      .from('warranty_jobs')
      .update({
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
        received_branch,
      })
      .eq('id', String(id))
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin
      .from('warranty_jobs')
      .delete()
      .eq('id', String(id))

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true })
  }

  return res.status(405).end()
})
