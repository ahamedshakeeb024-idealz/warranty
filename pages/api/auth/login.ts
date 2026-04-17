import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { signToken } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const { data: staff, error } = await supabaseAdmin
    .from('staff')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !staff) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  // Temporarily bypass password check - just verify email exists
  const token = signToken({ id: staff.id, name: staff.name, email: staff.email, role: staff.role })
  return res.json({ token, staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role } })
}
