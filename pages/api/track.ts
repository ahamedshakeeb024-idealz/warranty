import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../lib/supabase'

const COLUMNS =
  'job_no, device_type, serial_number, imei, customer_name, model, color, storage, received_date, received_branch, current_stage, stage_history(stage, created_at)'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { serial, imei, job_no } = req.query
  let column = ''
  let value = ''
  if (typeof job_no === 'string' && job_no.trim()) { column = 'job_no'; value = job_no.trim() }
  else if (typeof serial === 'string' && serial.trim()) { column = 'serial_number'; value = serial.trim() }
  else if (typeof imei === 'string' && imei.trim()) { column = 'imei'; value = imei.trim() }

  if (!column) return res.status(400).json({ error: 'Please enter a job number, serial number or IMEI.' })
  if (value.length > 64) return res.status(400).json({ error: 'That value looks too long.' })

  // Escape % and _ so customers cannot use wildcards to browse other jobs
  const escaped = value.replace(/[\\%_]/g, '\\$&')

  const { data, error } = await supabaseAdmin
    .from('warranty_jobs')
    .select(COLUMNS)
    .ilike(column, escaped)
    .order('created_at', { ascending: false })
    .limit(1)

  const rows = (data ?? []) as Array<Record<string, any>>
  if (error || rows.length === 0) {
    return res.status(404).json({ error: 'We could not find a device with those details.' })
  }

  const job = rows[0]
  if (Array.isArray(job.stage_history)) {
    job.stage_history.sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }

  res.setHeader('Cache-Control', 'no-store')
  return res.json(job)
}
