import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { useGoogleCalendar } from './useGoogleCalendar';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type { Owner } from '@/components/shared/OwnersEditor';

export type TransactionStage = 'signed' | 'live' | 'contract' | 'unconditional' | 'settled';
export type TransactionWarmth = 'active' | 'on_hold' | 'paused';

import type { Assignees, Attachment, VendorName, BuyerName } from '@/types/transaction';

export interface TransactionLink {
  id: string;
  title: string;
  url: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  team_id: string;
  created_by: string;
  last_edited_by: string;
  address: string;
  suburb?: string;
  listing_id?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  stage: TransactionStage;
  warmth: TransactionWarmth;
  vendor_names?: VendorName[];
  buyer_names?: BuyerName[];
  vendor_phone?: string;
  vendor_email?: string;
  owners?: Owner[];
  lead_source?: string;
  campaign_type?: string;
  live_date?: string;
  auction_deadline_date?: string;
  conditional_date?: string;
  links?: TransactionLink[];
  assignees?: Assignees;
  on_hold: boolean;
  archived: boolean;
  tasks_total: number;
  tasks_done: number;
  docs_total: number;
  docs_done: number;
  sale_price?: number;
  vendor_price?: number;
  team_price?: number;
  price_alignment_status?: 'aligned' | 'misaligned' | 'pending';
  expected_settlement?: string;
  contract_date?: string;
  unconditional_date?: string;
  settlement_date?: string;
  listing_signed_date?: string;
  photoshoot_date?: string;
  building_report_date?: string;
  listing_expires_date?: string;
  pre_settlement_inspection_date?: string;
  notes?: string;
  attachments?: Attachment[];
  latitude?: number;
  longitude?: number;
  geocoded_at?: string;
  geocode_error?: string;
  deal_history?: any[]; // JSONB array storing deal collapse history
  include_weekly_tasks?: boolean; // Whether to generate weekly recurring tasks
  created_at: string;
  updated_at: string;
}

export const useTransactions = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const queryClient = useQueryClient();
  const { isConnected, settings, syncEvent } = useGoogleCalendar();

  const { data: transactions = [], isLoading, error: queryError } = useQuery({
    queryKey: ['transactions', team?.id],
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async () => {
      if (!team?.id) {
        logger.info('No team ID available');
        return [];
      }
      
      logger.info('Fetching transactions for team:', { teamId: team.id });
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, team_id, created_by, last_edited_by,
          address, suburb, listing_id, client_name, client_email, client_phone,
          stage, warmth, on_hold, archived,
          vendor_names, buyer_names, vendor_phone, vendor_email, owners,
          lead_source, campaign_type,
          sale_price, vendor_price, team_price, price_alignment_status,
          expected_settlement, contract_date, unconditional_date, settlement_date,
          live_date, auction_deadline_date, conditional_date,
          listing_signed_date, photoshoot_date, building_report_date, 
          listing_expires_date, pre_settlement_inspection_date,
          tasks_total, tasks_done, docs_total, docs_done,
          links, assignees, notes, attachments,
          latitude, longitude, geocoded_at, geocode_error,
          deal_history,
          created_at, updated_at
        `)
        .eq('team_id', team.id)
        .order('expected_settlement', { ascending: true, nullsFirst: false });

      if (error) {
        logger.error('Transaction fetch error:', error);
        throw error;
      }
      
      logger.info('Fetched transactions:', { count: data?.length });
      // Map owners from JSONB
      return (data || []).map(t => ({
        ...t,
        owners: (t.owners as unknown as Owner[]) || [],
      })) as unknown as Transaction[];
    },
    enabled: !!user && !!team?.id,
  });

  if (queryError) {
    logger.error('Query error:', queryError);
  }

  const addTransaction = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'last_edited_by' | 'team_id'>) => {
      if (!user?.id || !team?.id) throw new Error('User or team not found');

      const { owners, ...rest } = transaction;
      const { data, error} = await supabase
        .from('transactions')
        .insert({
          ...rest,
          team_id: team.id,
          created_by: user.id,
          last_edited_by: user.id,
          links: transaction.links as any,
          assignees: transaction.assignees as any,
          vendor_names: transaction.vendor_names as any,
          buyer_names: transaction.buyer_names as any,
          attachments: transaction.attachments as any,
          owners: owners as any,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction added successfully');
      
      // Trigger geocoding for new transaction
      if (data?.address) {
        try {
          const { data: geocodeResult, error: geocodeError } = await supabase.functions.invoke('geocode-transaction', {
            body: { transactionId: data.id }
          });
          
          if (geocodeError) {
            logger.error('Geocoding failed:', geocodeError);
            toast.error(`Location warning: ${geocodeError.message || 'Geocoding failed'}. Use 'Fix Location' to set coordinates.`, { duration: 8000 });
          } else if (geocodeResult && geocodeResult.success === false) {
            toast.error(`Location warning: ${geocodeResult.message || geocodeResult.error || 'Address could not be geocoded'}. Use 'Fix Location' to set coordinates.`, { duration: 8000 });
          }
        } catch (error) {
          logger.error('Failed to geocode transaction:', error);
          toast.error("Location warning: Geocoding service error. Use 'Fix Location' to set coordinates.", { duration: 8000 });
        }
      }
      
      // Send team notification for new listing
      try {
        await supabase.functions.invoke('notify-team-transaction', {
          body: {
            transactionId: data.id,
            eventType: 'created',
            transactionAddress: data.address,
            teamId: data.team_id,
          },
        });
      } catch (error) {
        logger.error('Failed to send team notification:', error);
        // Don't fail the whole operation if notification fails
      }
      
      // Sync to Google Calendar if connected and enabled
      if (isConnected && settings?.sync_transactions && data) {
        syncEvent({ type: 'transaction', data });
      }
    },
    onError: (error) => {
      toast.error('Failed to add transaction');
      logger.error('Error adding transaction:', error);
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Transaction> }) => {
      if (!user?.id) throw new Error('User not found');

      const { owners, ...restUpdates } = updates;
      const { data, error } = await supabase
        .from('transactions')
        .update({
          ...restUpdates,
          last_edited_by: user.id,
          updated_at: new Date().toISOString(),
          links: updates.links as any,
          assignees: updates.assignees as any,
          vendor_names: updates.vendor_names as any,
          buyer_names: updates.buyer_names as any,
          attachments: updates.attachments as any,
          owners: owners as any,
        } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      // Optimistic update: Manually update the cache immediately
      queryClient.setQueryData<Transaction[]>(
        ['transactions', team?.id],
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((t) =>
            t.id === data.id ? { 
              ...t, 
              ...variables.updates,
              updated_at: data.updated_at,
              last_edited_by: data.last_edited_by
            } : t
          );
        }
      );
      
      // Still invalidate to ensure fresh data from server
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction updated');
      
      // Re-geocode if address or suburb changed
      if ((variables.updates.address || variables.updates.suburb) && data?.id) {
        try {
          const { data: geocodeResult, error: geocodeError } = await supabase.functions.invoke('geocode-transaction', {
            body: { transactionId: data.id }
          });
          
          if (geocodeError) {
            logger.error('Geocoding failed:', geocodeError);
            toast.error(`Location warning: ${geocodeError.message || 'Geocoding failed'}. Use 'Fix Location' to set coordinates.`, { duration: 8000 });
          } else if (geocodeResult && geocodeResult.success === false) {
            toast.error(`Location warning: ${geocodeResult.message || geocodeResult.error || 'Address could not be geocoded'}. Use 'Fix Location' to set coordinates.`, { duration: 8000 });
          }
        } catch (error) {
          logger.error('Failed to geocode transaction:', error);
          toast.error("Location warning: Geocoding service error. Use 'Fix Location' to set coordinates.", { duration: 8000 });
        }
      }
      
      // Sync to Google Calendar if connected and enabled (on key date changes)
      const dateFields = ['settlement_date', 'unconditional_date', 'listing_expires_date', 'expected_settlement'];
      const hasDateChange = dateFields.some(field => variables.updates[field as keyof typeof variables.updates] !== undefined);
      if (isConnected && settings?.sync_transactions && hasDateChange && data) {
        syncEvent({ type: 'transaction', data });
      }
    },
    onError: (error) => {
      toast.error('Failed to update transaction');
      logger.error('Error updating transaction:', error);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete transaction');
      logger.error('Error deleting transaction:', error);
    },
  });

  return {
    transactions,
    isLoading,
    addTransaction: addTransaction.mutateAsync,
    updateTransaction: updateTransaction.mutateAsync,
    deleteTransaction: deleteTransaction.mutateAsync,
  };
};