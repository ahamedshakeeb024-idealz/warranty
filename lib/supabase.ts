import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
)

export type Stage =
  | 'received'
  | 'sent_to_dubai'
  | 'at_dubai'
  | 'at_apple_mall'
  | 'received_from_apple_mall'
  | 'sent_to_sl'
  | 'received_sl'
  | 'handed_over'

export const STAGES: { key: Stage; label: string; description: string }[] = [
  { key: 'received',                 label: 'Device Received',               description: 'Device received at Idealz Lanka' },
  { key: 'sent_to_dubai',            label: 'Sent to Dubai (Prime)',          description: 'Device dispatched to Dubai' },
  { key: 'at_dubai',                 label: 'At Dubai',                       description: 'Device arrived in Dubai' },
  { key: 'at_apple_mall',            label: 'At Apple Mall',                  description: 'Submitted to Apple Mall service center' },
  { key: 'received_from_apple_mall', label: 'Received from Apple Mall',       description: 'Service completed, device collected' },
  { key: 'sent_to_sl',               label: 'Sent to Sri Lanka',              description: 'Device dispatched back to Sri Lanka' },
  { key: 'received_sl',              label: 'Received in Sri Lanka',          description: 'Device arrived in Sri Lanka' },
  { key: 'handed_over',              label: 'Handed Over to Customer',        description: 'Device returned to customer' },
]

export function getStageIndex(key: string) {
  return STAGES.findIndex(s => s.key === key)
}
