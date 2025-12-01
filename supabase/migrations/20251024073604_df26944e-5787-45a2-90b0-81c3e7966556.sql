-- Add invite_code to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Generate unique invite codes for existing users
UPDATE public.profiles 
SET invite_code = UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))
WHERE invite_code IS NULL;

-- Make invite_code unique and not null
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_invite_code_unique UNIQUE (invite_code);

ALTER TABLE public.profiles 
  ALTER COLUMN invite_code SET NOT NULL;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Function to notify friends when someone checks in
CREATE OR REPLACE FUNCTION public.notify_friends_on_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  checker_name TEXT;
  is_first_entry BOOLEAN;
BEGIN
  -- Check if this is the first KPI entry for the day
  SELECT NOT EXISTS (
    SELECT 1 FROM kpi_entries 
    WHERE user_id = NEW.user_id 
    AND entry_date = NEW.entry_date 
    AND id != NEW.id
  ) INTO is_first_entry;
  
  -- Only notify on first entry of the day
  IF is_first_entry THEN
    -- Get the user's name
    SELECT COALESCE(full_name, email) INTO checker_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Create notifications for all friends
    INSERT INTO notifications (user_id, type, title, message, metadata, expires_at)
    SELECT 
      CASE 
        WHEN fc.user_id = NEW.user_id THEN fc.friend_id
        ELSE fc.user_id
      END as notify_user_id,
      'friend_checkin',
      checker_name || ' checked in! 🔥',
      checker_name || ' has logged their KPIs for today',
      jsonb_build_object(
        'friend_id', NEW.user_id, 
        'checkin_date', NEW.entry_date,
        'friend_name', checker_name
      ),
      NOW() + INTERVAL '7 days'
    FROM friend_connections fc
    WHERE (fc.user_id = NEW.user_id OR fc.friend_id = NEW.user_id)
      AND fc.accepted = true
      AND CASE 
        WHEN fc.user_id = NEW.user_id THEN fc.friend_id
        ELSE fc.user_id
      END != NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for friend check-in notifications
DROP TRIGGER IF EXISTS trigger_notify_friends_on_checkin ON public.kpi_entries;
CREATE TRIGGER trigger_notify_friends_on_checkin
  AFTER INSERT ON public.kpi_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friends_on_checkin();

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION public.delete_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications
  WHERE expires_at < NOW();
END;
$$;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;