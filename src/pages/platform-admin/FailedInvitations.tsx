// Phase 5: Enhanced Error Handling & Recovery - Admin Recovery Tools
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Mail, 
  Clock, 
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const FailedInvitations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState<string | null>(null);

  // Fetch failed invitations
  const { data: failedInvites, isLoading } = useQuery({
    queryKey: ['failed-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_invitations')
        .select(`
          *,
          invited_by_profile:profiles!pending_invitations_invited_by_fkey(full_name, email),
          team:teams(name)
        `)
        .in('status', ['expired', 'failed'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    }
  });

  // Retry invitation
  const retryMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { data, error } = await supabase.functions.invoke('resend-invitation', {
        body: { invitation_id: inviteId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Invitation Resent',
        description: 'The invitation has been resent successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['failed-invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Retry Failed',
        description: error.message || 'Failed to resend invitation',
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setRetrying(null);
    }
  });

  // Delete invitation
  const deleteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('pending_invitations')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Invitation Deleted',
        description: 'The invitation has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['failed-invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete invitation',
        variant: 'destructive'
      });
    }
  });

  const handleRetry = (inviteId: string) => {
    setRetrying(inviteId);
    retryMutation.mutate(inviteId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Failed Invitations</h2>
        <p className="text-muted-foreground">
          Review and retry failed invitation attempts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedInvites?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {failedInvites?.filter(i => i.status === 'expired').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Past expiry date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {failedInvites?.filter(i => i.status === 'failed').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Error during sending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Failed Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Failed Invitation Details</CardTitle>
          <CardDescription>
            Retry or remove failed invitation attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {failedInvites && failedInvites.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>{(invite.team as any)?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {(invite.invited_by_profile as any)?.full_name || 
                       (invite.invited_by_profile as any)?.email || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={invite.status === 'expired' ? 'secondary' : 'destructive'}
                      >
                        {invite.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(invite.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(invite.id)}
                          disabled={retrying === invite.id || retryMutation.isPending}
                        >
                          {retrying === invite.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(invite.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">No Failed Invitations</p>
              <p className="text-sm text-muted-foreground">
                All invitations are functioning normally
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
