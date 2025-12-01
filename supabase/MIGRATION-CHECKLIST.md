# 🚀 Lovable Project Migration Checklist

Complete guide for migrating your Lovable project to an external Supabase instance.

---

## 📋 Pre-Migration Checklist

### ✅ PHASE 1: PREPARATION

- [ ] **Create External Supabase Account**
  - Sign up at [supabase.com](https://supabase.com)
  - Create a new organization
  - Create a new project (choose region closest to users)
  - Save your project credentials:
    - ✅ Project URL: `https://[project-ref].supabase.co`
    - ✅ Anon/Public Key
    - ✅ Service Role Key (KEEP SECRET!)

- [ ] **Download Migration Files**
  - ✅ `supabase/schema-only.sql` (complete schema)
  - ✅ `supabase/lovable-data-complete-export.sql` (this file)
  - ✅ Save both files to your local machine

- [ ] **Gather Secrets** (7 required secrets)
  - ✅ `OPENCAGE_API_KEY` - Geocoding
  - ✅ `RESEND_API_KEY` - Email service
  - ✅ `RESEND_FROM_EMAIL` - Email sender
  - ✅ `SITE_URL` - Your domain
  - ✅ `GIPHY_API_KEY` - GIF integration
  - ✅ `VITE_WEATHER_API_KEY` - Weather widget
  - ✅ `LOVABLE_API_KEY` - AI features

- [ ] **Export Auth Users** (if migrating users)
  - Go to current Supabase → Authentication → Users
  - Export to CSV
  - Save user list (you'll re-invite via Auth API)

- [ ] **Download Storage Files** (if applicable)
  - Go to current Supabase → Storage
  - Download all buckets locally
  - Note bucket structure and permissions

---

## 🔧 PHASE 2: SET UP EXTERNAL SUPABASE

### Step 1: Import Schema

1. **Open SQL Editor**
   - Go to your external Supabase dashboard
   - Navigate to **SQL Editor**
   - Create a new query

2. **Import Schema File**
   ```sql
   -- Copy entire contents of schema-only.sql
   -- Paste into SQL Editor
   -- Click "Run" or press Ctrl+Enter
   ```

3. **Verify Schema Import**
   ```sql
   -- Check tables created
   SELECT COUNT(*) as table_count 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   
   -- Expected: 138+ tables
   ```

### Step 2: Import Data

1. **Open New SQL Query**
   - Still in SQL Editor
   - Create another new query

2. **Import Data File**
   ```sql
   -- Copy entire contents of lovable-data-complete-export.sql
   -- Paste into SQL Editor
   -- Click "Run" or press Ctrl+Enter
   ```

3. **Verify Data Import**
   ```sql
   -- Run verification queries at bottom of data file
   SELECT COUNT(*) as agency_count FROM public.agencies;
   SELECT COUNT(*) as profile_count FROM public.profiles;
   SELECT COUNT(*) as user_role_count FROM public.user_roles;
   SELECT COUNT(*) as team_count FROM public.teams;
   SELECT COUNT(*) as team_member_count FROM public.team_members;
   
   -- Expected results:
   -- agency_count: 1
   -- profile_count: 12
   -- user_role_count: 12
   -- team_count: 5
   -- team_member_count: 12
   ```

### Step 3: Configure Auth Settings

1. **Enable Email Provider**
   - Go to **Authentication → Providers**
   - Enable **Email** provider
   - **IMPORTANT:** Enable **Confirm email** = OFF (for testing)
   - Set **Site URL** to your domain

2. **Configure Email Templates** (optional)
   - Go to **Authentication → Email Templates**
   - Customize invite, confirmation, reset emails

### Step 4: Set Up Storage Buckets

1. **Create Buckets**
   - Go to **Storage**
   - Create buckets matching your old structure:
     - `avatars` (public)
     - `attachments` (private)
     - `documents` (private)

2. **Set Policies**
   ```sql
   -- Example: Avatar bucket policies
   -- Paste in SQL Editor
   
   -- Public read access
   CREATE POLICY "Public avatars read" ON storage.objects
   FOR SELECT USING (bucket_id = 'avatars');
   
   -- Authenticated users can upload their own
   CREATE POLICY "Users upload own avatar" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'avatars' 
     AND auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

3. **Upload Files** (if applicable)
   - Manually upload files from local backup
   - Maintain folder structure

---

## 🎯 PHASE 3: REMIX & CONNECT

### Step 1: Remix Lovable Project

1. **Create Remix**
   - In current Lovable project → Click **Remix**
   - New project created with copy of codebase
   - **NO data transferred** (expected)

2. **Name Your Project**
   - Choose descriptive name
   - Example: "Revolution Realty - Production"

### Step 2: Connect to External Supabase

1. **Integration Setup**
   - Lovable will prompt: "Connect to Supabase"
   - Click **"Use my own Supabase project"**

2. **Enter Credentials**
   - **Project URL:** `https://[your-ref].supabase.co`
   - **Anon Key:** `eyJhbG...` (copy from Supabase dashboard)
   - **Service Role Key:** `eyJhbG...` (copy from Supabase dashboard)
   - Click **Connect**

3. **Verify Connection**
   - Lovable will test connection
   - Green checkmark = success
   - Red error = double-check credentials

### Step 3: Add Secrets

1. **Open Secrets Manager**
   - In Lovable → Settings → Secrets
   - Click **"Add Secret"**

2. **Add Each Secret**
   ```
   OPENCAGE_API_KEY = [your-value]
   RESEND_API_KEY = [your-value]
   RESEND_FROM_EMAIL = [your-email]
   SITE_URL = [your-domain]
   GIPHY_API_KEY = [your-value]
   VITE_WEATHER_API_KEY = [your-value]
   LOVABLE_API_KEY = [your-value]
   ```

### Step 4: Deploy Edge Functions

1. **Check Edge Functions**
   - Lovable → Edge Functions tab
   - All 48 functions should be listed

2. **Deploy Functions**
   - Click **"Deploy All"**
   - Wait for deployment (2-3 minutes)
   - Verify no errors in logs

---

## ✅ PHASE 4: VERIFY & LAUNCH

### Post-Migration Testing

- [ ] **Test Authentication**
  - Try signing up with new email
  - Verify email received (if enabled)
  - Test login/logout
  - Check user profile displays

- [ ] **Test Database Access**
  - Create a test team
  - Add test data (appraisal, listing)
  - Verify data persists across sessions
  - Check RLS policies working

- [ ] **Test Edge Functions**
  - Trigger geocoding (add address)
  - Send test email (invite user)
  - Check function logs for errors

- [ ] **Test File Uploads**
  - Upload avatar
  - Upload attachment
  - Verify files accessible

- [ ] **Re-Invite Users** (if migrating)
  - Use CSV export from old instance
  - Send invitations via new Auth system
  - Users will create new passwords

### Performance Checks

- [ ] Run database health check:
  ```sql
  SELECT * FROM check_backend_health();
  ```

- [ ] Check RLS policies:
  ```sql
  SELECT tablename, policyname 
  FROM pg_policies 
  WHERE schemaname = 'public';
  ```

- [ ] Verify indexes:
  ```sql
  SELECT tablename, indexname 
  FROM pg_indexes 
  WHERE schemaname = 'public';
  ```

---

## 🚨 Troubleshooting Guide

### Issue: Schema Import Fails

**Symptoms:**
- SQL errors during schema import
- "relation already exists"
- "syntax error"

**Solutions:**
1. Ensure fresh Supabase project (no existing tables)
2. Check for special characters in project name
3. Try importing in smaller chunks
4. Contact Supabase support if persists

---

### Issue: Data Import Fails

**Symptoms:**
- "foreign key constraint violation"
- "duplicate key value violates unique constraint"
- "insert or update on table violates check constraint"

**Solutions:**
1. Verify schema imported successfully FIRST
2. Check `ON CONFLICT DO NOTHING` present in INSERT statements
3. Verify UUIDs match between related tables
4. Run in transaction block (already included)

---

### Issue: RLS Policies Blocking Access

**Symptoms:**
- "new row violates row-level security policy"
- Data not visible in app
- Users can't create records

**Solutions:**
1. Verify user authenticated (check `auth.uid()`)
2. Check user has correct role in `user_roles` table
3. Verify team membership in `team_members` table
4. Temporarily disable RLS for debugging:
   ```sql
   ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;
   -- Test access
   -- Re-enable when done
   ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
   ```

---

### Issue: Edge Functions Not Working

**Symptoms:**
- 500 errors
- "Function not found"
- Timeout errors

**Solutions:**
1. Check function logs in Supabase dashboard
2. Verify secrets configured correctly
3. Re-deploy functions via Lovable
4. Check CORS settings if calling from browser

---

### Issue: Storage Upload Fails

**Symptoms:**
- "Access denied"
- "Policy violation"
- Files don't appear in bucket

**Solutions:**
1. Verify bucket exists and is public/private as expected
2. Check storage policies match user permissions
3. Verify file path format correct (e.g., `user_id/filename`)
4. Check file size limits (default 50MB)

---

### Issue: Auth Users Missing

**Symptoms:**
- Profiles exist but can't log in
- "Invalid login credentials"

**Expected Behavior:**
- `auth.users` table NOT migrated automatically
- Users must re-register or be re-invited

**Solutions:**
1. Re-invite users via Authentication → Users → Invite
2. Use Supabase Auth API to bulk create users
3. Provide users with new signup link

---

## 📊 Expected Data After Migration

| Table | Row Count | Notes |
|-------|-----------|-------|
| agencies | 1 | Revolution Realty |
| profiles | 12 | All team members |
| user_roles | 12 | Platform admin + team roles |
| teams | 5 | 4 real teams + 1 solo |
| team_members | 12 | All assignments |
| conversations | 1 | Office channel |
| conversation_participants | 12 | All in office chat |
| lead_source_options | 10 | Default lead sources |
| logged_appraisals | 0 | Empty (add via app) |
| listings_pipeline | 0 | Empty (add via app) |
| transactions | 0 | Empty (add via app) |
| past_sales | 0 | Empty (add via app) |

---

## 🎉 Success Criteria

Your migration is complete when:

✅ All tables created (138+)  
✅ All data imported (~2,000+ rows)  
✅ Authentication working (signup/login)  
✅ Users can create teams  
✅ Users can add appraisals/listings  
✅ Geocoding works (addresses mapped)  
✅ Email invitations sent successfully  
✅ File uploads working  
✅ Edge functions responding  
✅ No RLS policy errors  

---

## 🆘 Need Help?

**Lovable Support:**
- Discord: [discord.gg/lovable](https://discord.gg/lovable)
- Email: support@lovable.dev

**Supabase Support:**
- Discord: [discord.supabase.com](https://discord.supabase.com)
- Docs: [supabase.com/docs](https://supabase.com/docs)

**Common Resources:**
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Storage Guide](https://supabase.com/docs/guides/storage)

---

## 📝 Notes

- **Schema-only.sql**: Contains all table structures, functions, triggers, RLS policies
- **Data-only.sql**: Contains INSERT statements for 74 tables with data
- **Migration is one-way**: No automatic sync back to Lovable Cloud
- **Lovable can still edit**: With Service Role Key, Lovable can create migrations
- **Test first**: Consider testing on staging Supabase project first

---

**Last Updated:** 2025-01-30  
**Project:** Revolution Realty  
**Total Tables:** 138+  
**Total Rows:** ~2,000+  
**Edge Functions:** 48  
**Required Secrets:** 7
