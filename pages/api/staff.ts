import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '../../lib/supabase'
import { requireAdmin } from '../../lib/auth'

export default requireAdmin(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('staff')
      .select('id, name, email, role, created_at')
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (req.method === 'POST') {
    const { name, email, password, role } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const password_hash = await bcrypt.hash(password, 10)

    const { data, error } = await supabaseAdmin
      .from('staff')
      .insert({ name, email: email.toLowerCase().trim(), password_hash, role: role || 'staff' })
      .select('id, name, email, role, created_at')
      .single()

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Email already exists' })
      return res.status(500).json({ error: error.message })
    }

    return res.status(201).json(data)
  }

  return res.status(405).end()
})
