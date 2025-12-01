-- Fix foreign key relationships to reference profiles instead of auth.users

-- 1. Fix note_comments.user_id
ALTER TABLE public.note_comments 
DROP CONSTRAINT IF EXISTS note_comments_user_id_fkey;

ALTER TABLE public.note_comments 
ADD CONSTRAINT note_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Fix note_shares.user_id
ALTER TABLE public.note_shares 
DROP CONSTRAINT IF EXISTS note_shares_user_id_fkey;

ALTER TABLE public.note_shares 
ADD CONSTRAINT note_shares_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Fix note_shares.invited_by
ALTER TABLE public.note_shares 
DROP CONSTRAINT IF EXISTS note_shares_invited_by_fkey;

ALTER TABLE public.note_shares 
ADD CONSTRAINT note_shares_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Ensure profiles table has proper RLS policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 5. Create storage policies for message-attachments bucket
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Authenticated users can view images" ON storage.objects;
CREATE POLICY "Authenticated users can view images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');