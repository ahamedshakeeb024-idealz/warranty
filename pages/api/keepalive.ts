import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { error } = await supabaseAdmin.from('warranty_jobs').select('id').limit(1)
  if (error) return res.status(500).json({ ok: false, error: error.message })
  return res.json({ ok: true, time: new Date().toISOString() })
}
