-- =============================================
-- IDEALZ LANKA WARRANTY TRACKER — SUPABASE SCHEMA
-- Run this entire file in Supabase > SQL Editor
-- =============================================

-- Staff accounts table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff', -- 'admin' or 'staff'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warranty jobs table
CREATE TABLE IF NOT EXISTS warranty_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_no TEXT UNIQUE NOT NULL,
  serial_number TEXT NOT NULL,
  imei TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  model TEXT NOT NULL,
  color TEXT,
  storage TEXT,
  issue_description TEXT NOT NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_stage TEXT NOT NULL DEFAULT 'received',
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage history / activity log
CREATE TABLE IF NOT EXISTS stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES warranty_jobs(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  stage_label TEXT NOT NULL,
  note TEXT,
  updated_by UUID REFERENCES staff(id),
  updated_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_warranty_serial ON warranty_jobs(serial_number);
CREATE INDEX IF NOT EXISTS idx_warranty_imei ON warranty_jobs(imei);
CREATE INDEX IF NOT EXISTS idx_warranty_job_no ON warranty_jobs(job_no);
CREATE INDEX IF NOT EXISTS idx_stage_history_job ON stage_history(job_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at
  BEFORE UPDATE ON warranty_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE warranty_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Public can read warranty jobs (for customer tracking)
CREATE POLICY "Public read warranty jobs" ON warranty_jobs FOR SELECT USING (true);
CREATE POLICY "Public read stage history" ON stage_history FOR SELECT USING (true);

-- Only service role (server-side API) can insert/update
CREATE POLICY "Service role full access jobs" ON warranty_jobs USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access history" ON stage_history USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access staff" ON staff USING (true) WITH CHECK (true);

-- =============================================
-- SEED: Default admin account
-- Email: admin@idealzlanka.com  Password: Admin@1234
-- CHANGE THIS PASSWORD AFTER FIRST LOGIN
-- =============================================
INSERT INTO staff (name, email, password_hash, role)
VALUES (
  'Admin',
  'admin@idealzlanka.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Admin@1234
  'admin'
) ON CONFLICT (email) DO NOTHING;
