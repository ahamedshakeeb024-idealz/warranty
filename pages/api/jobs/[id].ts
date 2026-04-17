import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'

export default requireAuth(async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  return res.status(405).end()
})
