-- Fix foreign key relationships to point to profiles instead of auth.users
-- This enables PostgREST to follow relationships properly for the social feed

-- Drop existing foreign keys
ALTER TABLE public.social_posts DROP CONSTRAINT IF EXISTS social_posts_user_id_fkey;
ALTER TABLE public.post_reactions DROP CONSTRAINT IF EXISTS post_reactions_user_id_fkey;
ALTER TABLE public.post_comments DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;
ALTER TABLE public.weekly_reflection_prompts DROP CONSTRAINT IF EXISTS weekly_reflection_prompts_user_id_fkey;
ALTER TABLE public.birthday_celebrations DROP CONSTRAINT IF EXISTS birthday_celebrations_birthday_user_id_fkey;

-- Add new foreign keys pointing to profiles
ALTER TABLE public.social_posts 
  ADD CONSTRAINT social_posts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.post_reactions 
  ADD CONSTRAINT post_reactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.post_comments 
  ADD CONSTRAINT post_comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.weekly_reflection_prompts 
  ADD CONSTRAINT weekly_reflection_prompts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.birthday_celebrations 
  ADD CONSTRAINT birthday_celebrations_birthday_user_id_fkey 
  FOREIGN KEY (birthday_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;