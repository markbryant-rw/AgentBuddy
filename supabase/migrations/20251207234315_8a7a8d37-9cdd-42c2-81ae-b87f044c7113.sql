-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Push notification settings
  push_enabled boolean DEFAULT false,
  
  -- In-app notification types
  notify_team_member_joined boolean DEFAULT true,
  notify_listing_stage_signed boolean DEFAULT true,
  notify_listing_stage_live boolean DEFAULT true,
  notify_listing_stage_contract boolean DEFAULT true,
  notify_listing_stage_unconditional boolean DEFAULT true,
  notify_listing_stage_settled boolean DEFAULT true,
  notify_task_assigned boolean DEFAULT true,
  notify_task_due_soon boolean DEFAULT true,
  
  -- Email digest settings
  email_digest_enabled boolean DEFAULT true,
  email_digest_frequency text DEFAULT 'daily' CHECK (email_digest_frequency IN ('daily', 'weekly', 'none')),
  email_digest_hour integer DEFAULT 8 CHECK (email_digest_hour >= 0 AND email_digest_hour <= 23),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create push_subscriptions table for Web Push
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Add digest_sent_at to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS digest_sent_at timestamptz;

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_preferences
CREATE POLICY "Users can manage their own notification preferences"
ON public.notification_preferences FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS policies for push_subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
ON public.push_subscriptions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX idx_notifications_digest ON public.notifications(user_id, is_read, digest_sent_at);