import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

const JWT_SECRET = process.env.JWT_SECRET!

export interface StaffPayload {
  id: string
  name: string
  email: string
  role: string
}

export function signToken(payload: StaffPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' })
}

export function verifyToken(token: string): StaffPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as StaffPayload
  } catch {
    return null
  }
}

export function getStaffFromRequest(req: NextApiRequest): StaffPayload | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  return verifyToken(auth.slice(7))
}

export function requireAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, staff: StaffPayload) => Promise<unknown>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const staff = getStaffFromRequest(req)
    if (!staff) return res.status(401).json({ error: 'Unauthorized' })
    return handler(req, res, staff)
  }
}

export function requireAdmin(
  handler: (req: NextApiRequest, res: NextApiResponse, staff: StaffPayload) => Promise<unknown>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const staff = getStaffFromRequest(req)
    if (!staff) return res.status(401).json({ error: 'Unauthorized' })
    if (staff.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
    return handler(req, res, staff)
  }
}
