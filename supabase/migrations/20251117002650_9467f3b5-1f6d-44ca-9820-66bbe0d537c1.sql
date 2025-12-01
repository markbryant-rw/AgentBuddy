-- Enable realtime for daily_activities table so changes are pushed instantly to clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_activities;