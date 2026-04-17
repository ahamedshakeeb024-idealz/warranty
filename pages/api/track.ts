import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { serial, imei, job_no } = req.query
  if (!serial && !imei && !job_no) return res.status(400).json({ error: 'Provide serial, imei, or job_no' })

  let query = supabase.from('warranty_jobs').select('*, stage_history(*)')

  if (serial) query = query.ilike('serial_number', String(serial))
  else if (imei) query = query.ilike('imei', String(imei))
  else if (job_no) query = query.ilike('job_no', String(job_no))

  const { data, error } = await query.single()

  if (error || !data) return res.status(404).json({ error: 'Device not found. Please check your details and try again.' })

  // Sort history by date
  if (data.stage_history) {
    data.stage_history.sort((a: { created_at: string }, b: { created_at: string }) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }

  return res.json(data)
}
