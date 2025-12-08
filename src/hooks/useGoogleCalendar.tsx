import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CalendarConnection {
  id: string;
  user_id: string;
  calendar_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CalendarSyncSettings {
  id: string;
  user_id: string;
  sync_daily_planner: boolean;
  sync_appraisals: boolean;
  sync_transactions: boolean;
}

export function useGoogleCalendar() {
  const queryClient = useQueryClient();

  const connectionQuery = useQuery({
    queryKey: ['google-calendar-connection'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_calendar_connections')
        .select('id, user_id, calendar_id, created_at, updated_at')
        .maybeSingle();
      
      if (error) throw error;
      return data as CalendarConnection | null;
    },
  });

  const settingsQuery = useQuery({
    queryKey: ['google-calendar-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_sync_settings')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      return data as CalendarSyncSettings | null;
    },
    enabled: !!connectionQuery.data,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth');
      if (error) throw error;
      return data.authUrl;
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl;
    },
    onError: (error) => {
      console.error('Failed to start OAuth:', error);
      toast.error('Failed to connect to Google Calendar');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar-disconnect');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-connection'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-settings'] });
      toast.success('Google Calendar disconnected');
    },
    onError: (error) => {
      console.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect Google Calendar');
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<CalendarSyncSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('calendar_sync_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-settings'] });
      toast.success('Sync settings updated');
    },
    onError: (error) => {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    },
  });

  const syncEventMutation = useMutation({
    mutationFn: async ({ type, data }: { type: 'planner' | 'appraisal' | 'transaction'; data: any }) => {
      const { data: result, error } = await supabase.functions.invoke('sync-to-google-calendar', {
        body: { type, data },
      });
      if (error) throw error;
      return result;
    },
    onError: (error) => {
      console.error('Failed to sync event:', error);
      // Silent fail - don't toast on every sync failure
    },
  });

  return {
    connection: connectionQuery.data,
    isConnected: !!connectionQuery.data,
    isLoadingConnection: connectionQuery.isLoading,
    settings: settingsQuery.data,
    isLoadingSettings: settingsQuery.isLoading,
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    updateSettings: updateSettingsMutation.mutate,
    isUpdatingSettings: updateSettingsMutation.isPending,
    syncEvent: syncEventMutation.mutate,
    isSyncing: syncEventMutation.isPending,
  };
}
