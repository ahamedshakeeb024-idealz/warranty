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

export type DeviceType = 'apple' | 'genext' | 'other'

export type AppleStage =
  | 'device_received'
  | 'appointment_done'
  | 'handed_over_relevant'
  | 'sent_to_dubai'
  | 'at_apple_mall'
  | 'received_from_apple_mall'
  | 'sent_to_sl'
  | 'received_at_prime'
  | 'handed_over_customer'

export type GenextStage =
  | 'device_received'
  | 'handed_over_genext'
  | 'job_reference_received'
  | 'device_ready_genext'
  | 'device_received_prime'
  | 'handed_over_customer'

export type OtherStage =
  | 'device_received'
  | 'handed_over_relevant'
  | 'sent_to_dubai'
  | 'received_supplier'
  | 'sent_to_sl'
  | 'received_at_prime'
  | 'handed_over_customer'

export type AnyStage = AppleStage | GenextStage | OtherStage

export const APPLE_STAGES: { key: AppleStage; label: string }[] = [
  { key: 'device_received',           label: 'Device Received' },
  { key: 'appointment_done',          label: 'Appointment Done (Apple)' },
  { key: 'handed_over_relevant',      label: 'Handed Over to Relevant Person' },
  { key: 'sent_to_dubai',             label: 'Sent to Dubai' },
  { key: 'at_apple_mall',             label: 'At Apple Mall' },
  { key: 'received_from_apple_mall',  label: 'Received from Apple Mall' },
  { key: 'sent_to_sl',                label: 'Sent to Sri Lanka' },
  { key: 'received_at_prime',         label: 'Received at iDealz Prime' },
  { key: 'handed_over_customer',      label: 'Handed Over to Customer / Shop' },
]

export const GENEXT_STAGES: { key: GenextStage; label: string }[] = [
  { key: 'device_received',        label: 'Device Received' },
  { key: 'handed_over_genext',     label: 'Handed Over to Genext' },
  { key: 'job_reference_received', label: 'Job Reference Received from Genext' },
  { key: 'device_ready_genext',    label: 'Device Ready at Genext' },
  { key: 'device_received_prime',  label: 'Device Received to Prime' },
  { key: 'handed_over_customer',   label: 'Handed Over to Customer / Shop' },
]

export const OTHER_STAGES: { key: OtherStage; label: string }[] = [
  { key: 'device_received',       label: 'Device Received to Prime' },
  { key: 'handed_over_relevant',  label: 'Handed Over to Relevant Person' },
  { key: 'sent_to_dubai',         label: 'Sent to Dubai' },
  { key: 'received_supplier',     label: 'Received by Supplier / Repaired / Replaced' },
  { key: 'sent_to_sl',            label: 'Sent to Sri Lanka' },
  { key: 'received_at_prime',     label: 'Received at iDealz Prime' },
  { key: 'handed_over_customer',  label: 'Handed Over to Customer / Shop' },
]

export function getStagesForType(type: DeviceType) {
  if (type === 'apple') return APPLE_STAGES
  if (type === 'genext') return GENEXT_STAGES
  return OTHER_STAGES
}

export function getStageIndex(type: DeviceType, key: string) {
  return getStagesForType(type).findIndex(s => s.key === key)
}

export function getStageLabelForType(type: DeviceType, key: string) {
  return getStagesForType(type).find(s => s.key === key)?.label ?? key
}

export function getFinalStage(type: DeviceType) {
  const stages = getStagesForType(type)
  return stages[stages.length - 1].key
}
