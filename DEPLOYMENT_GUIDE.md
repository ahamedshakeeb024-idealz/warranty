# Idealz Lanka Warranty Tracker — Deployment Guide

## Overview
- **Frontend + API**: Next.js → hosted on Vercel (free tier)
- **Database**: Supabase (free tier, PostgreSQL)
- **Auth**: JWT tokens (email + password for staff)
- **Public tracking**: Serial Number / IMEI / Job Number

---

## STEP 1 — Set Up Supabase

1. Go to https://supabase.com → Sign up / Log in
2. Click **New Project** → name it `idealz-warranty`
3. Choose a strong database password → **Save it**
4. Region: choose **Southeast Asia (Singapore)**
5. Wait ~2 minutes for the project to be ready

### Run the database schema:
1. In Supabase sidebar → **SQL Editor**
2. Click **New Query**
3. Open the file `supabase-schema.sql` from this project
4. Paste the entire contents → click **Run**
5. You should see: "Success. No rows returned"

### Get your API keys:
1. Supabase sidebar → **Project Settings** → **API**
2. Copy these three values (you'll need them in Step 3):
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`

---

## STEP 2 — Push Code to GitHub

1. Go to https://github.com → Create a **New Repository**
   - Name: `idealz-warranty-tracker`
   - Set to **Private**
2. On your computer, open Terminal in the project folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/idealz-warranty-tracker.git
git push -u origin main
```

---

## STEP 3 — Deploy on Vercel

1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New Project** → Import your `idealz-warranty-tracker` repo
3. Framework will auto-detect as **Next.js** ✓
4. Click **Environment Variables** and add ALL of these:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `JWT_SECRET` | Any long random string (min 32 chars) e.g. `idealz_lanka_warranty_2024_super_secret_key_xyz` |

5. Click **Deploy** → Wait ~2 minutes
6. Your site will be live at: `https://idealz-warranty-tracker.vercel.app`

---

## STEP 4 — First Login

Default admin account (created by the SQL schema):
- **Email**: `admin@idealzlanka.com`
- **Password**: `Admin@1234`

**⚠️ IMPORTANT**: Change this password immediately after first login.
To change: You'll need to update it in Supabase → Table Editor → staff table.

To generate a bcrypt hash for a new password, use: https://bcrypt-generator.com

---

## STEP 5 — Add Your Staff

1. Log in at `/staff/login`
2. Go to Dashboard → click **Manage Staff** (top right)
3. Add each staff member with their email and a temporary password
4. Tell them to log in and you can update passwords from Supabase if needed

---

## How It Works

### Staff Workflow:
1. Staff logs in at `yoursite.com/staff/login`
2. Dashboard shows all warranty jobs with filters
3. Click **+ New Job** to add a new device
4. Click **Update** next to a job to advance its stage + add notes
5. Every update is logged with staff name + timestamp

### Customer Workflow:
1. Customer visits `yoursite.com`
2. Enters Serial Number, IMEI, and/or Job Number
3. Sees the full journey timeline with dates and notes
4. No login required — completely public

### The 8 Warranty Stages:
1. Device Received
2. Sent to Dubai (Prime)
3. At Dubai
4. At Apple Mall
5. Received from Apple Mall
6. Sent to Sri Lanka
7. Received in Sri Lanka
8. Handed Over to Customer

---

## Updating the Site Later

Any code changes pushed to GitHub will **automatically redeploy** on Vercel.

---

## Custom Domain (Optional)

1. In Vercel → your project → **Settings** → **Domains**
2. Add your domain e.g. `warranty.idealzlanka.com`
3. Follow DNS instructions (add CNAME record in your domain registrar)

---

## Support & Troubleshooting

- **"Unauthorized" errors**: JWT_SECRET env variable not set in Vercel
- **"Cannot find device"**: Check Supabase → Table Editor → warranty_jobs table
- **Login not working**: Run the SQL schema again in Supabase SQL Editor
- **Build fails on Vercel**: Check all 4 environment variables are set correctly
