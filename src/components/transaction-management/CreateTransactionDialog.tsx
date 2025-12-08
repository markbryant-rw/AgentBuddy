import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TransactionStage } from '@/hooks/useTransactions';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { useAssignableTeamMembers } from '@/hooks/useAssignableTeamMembers';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { GoogleAddressAutocomplete, AddressResult } from '@/components/shared/GoogleAddressAutocomplete';

interface CreateTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTransactionDialog = ({ open, onOpenChange }: CreateTransactionDialogProps) => {
  const { team } = useTeam();
  const { user, isPlatformAdmin } = useAuth();
  const { assignableMembers, isLoading: membersLoading, hasTeamContext } = useAssignableTeamMembers();
  const { preferences } = useUserPreferences();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    suburb: '',
    client_name: '',
    stage: 'signed' as TransactionStage,
    live_date: '',
    auction_deadline_date: '',
    expected_settlement: '',
    assignees: {
      lead_salesperson: '',
      secondary_salesperson: null as string | null,
      admin: '',
      support: null as string | null,
    }
  });

  // Load default role preferences when dialog opens
  useEffect(() => {
    if (open && preferences) {
      setFormData(prev => ({
        ...prev,
        assignees: {
          ...prev.assignees,
          lead_salesperson: preferences.default_transaction_role_salesperson || '',
          admin: preferences.default_transaction_role_admin || '',
        }
      }));
    }
  }, [open, preferences]);

  // Auto-populate for solo team members or empty team fallback
  useEffect(() => {
    logger.log('[CreateTransactionDialog] Assignable members loaded:', assignableMembers);
    logger.log('[CreateTransactionDialog] Assignable members count:', assignableMembers.length);
    
    if (open && assignableMembers.length === 1 && user) {
      const soloMember = assignableMembers[0];
      logger.log('[CreateTransactionDialog] Solo member detected:', soloMember);
      
      // Auto-populate both required roles with the solo member
      setFormData(prev => {
        // Only auto-populate if roles are empty
        if (!prev.assignees.lead_salesperson && !prev.assignees.admin) {
          logger.log('[CreateTransactionDialog] Auto-populating roles for solo member');
          toast.success('Auto-assigned you to required roles');
          return {
            ...prev,
            assignees: {
              ...prev.assignees,
              lead_salesperson: soloMember.user_id,
              admin: soloMember.user_id,
            }
          };
        }
        return prev;
      });
    }
  }, [open, assignableMembers, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // For platform admins without team context, show error
    if (!team && !isPlatformAdmin) {
      toast.error('No team context found. Please select a team first.');
      return;
    }

    // Validate required roles
    if (!formData.assignees.lead_salesperson || !formData.assignees.admin) {
      toast.error('Please assign both Lead Salesperson and Admin');
      return;
    }

    setLoading(true);
    try {
      // Determine team_id: use team if available, otherwise need to handle platform admin case
      const teamId = team?.id;
      
      if (!teamId) {
        toast.error('Unable to determine team context. Please contact support.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('transactions').insert({
        team_id: teamId,
        transaction_type: 'sale',
        created_by: user.id,
        last_edited_by: user.id,
        address: formData.address,
        suburb: formData.suburb || null,
        client_name: formData.client_name,
        stage: formData.stage,
        live_date: formData.live_date || null,
        auction_deadline_date: formData.auction_deadline_date || null,
        expected_settlement: formData.expected_settlement || null,
        assignees: formData.assignees,
        warmth: 'active',
        on_hold: false,
        archived: false,
      });

      if (error) throw error;

      toast.success('Transaction created successfully');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onOpenChange(false);
      
      // Reset form
      setFormData({
        address: '',
        suburb: '',
        client_name: '',
        stage: 'signed',
        live_date: '',
        auction_deadline_date: '',
        expected_settlement: '',
        assignees: {
          lead_salesperson: '',
          secondary_salesperson: null,
          admin: '',
          support: null,
        }
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      assignees: {
        ...prev.assignees,
        [role]: value === 'NONE' ? null : value
      }
    }));
  };

  const handleAssignMeToAll = () => {
    logger.log('[CreateTransactionDialog] handleAssignMeToAll clicked');
    logger.log('[CreateTransactionDialog] Current user:', user);
    logger.log('[CreateTransactionDialog] Assignable members:', assignableMembers);
    
    if (!user) {
      console.error('[CreateTransactionDialog] No user found');
      return;
    }
    
    logger.log('[CreateTransactionDialog] Setting all roles to user:', user.id);
    setFormData(prev => {
      const newState = {
        ...prev,
        assignees: {
          lead_salesperson: user.id,
          secondary_salesperson: null,
          admin: user.id,
          support: null,
        }
      };
      logger.log('[CreateTransactionDialog] New form state:', newState);
      return newState;
    });
    toast.success('Assigned you to all roles');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Listing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Property Address *</Label>
              <GoogleAddressAutocomplete
                placeholder="Start typing address..."
                defaultValue=""
                onSelect={(result: AddressResult) => {
                  setFormData(prev => ({
                    ...prev,
                    address: result.address,
                    suburb: result.suburb || prev.suburb,
                  }));
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb</Label>
                <Input
                  id="suburb"
                  value={formData.suburb}
                  onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                  placeholder="Auckland Central"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_name">Vendor Name *</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="John Smith"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">Initial Stage *</Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => setFormData({ ...formData, stage: value as TransactionStage })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="contract">Under Contract</SelectItem>
                  <SelectItem value="unconditional">Unconditional</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Key Dates */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Key Dates</h3>
            
            <div className="space-y-2">
              <Label htmlFor="live_date">Live Date</Label>
              <Input
                id="live_date"
                type="date"
                value={formData.live_date}
                onChange={(e) => setFormData({ ...formData, live_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auction_deadline_date">Auction/Deadline Date</Label>
              <Input
                id="auction_deadline_date"
                type="date"
                value={formData.auction_deadline_date}
                onChange={(e) => setFormData({ ...formData, auction_deadline_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_settlement">Expected Settlement</Label>
              <Input
                id="expected_settlement"
                type="date"
                value={formData.expected_settlement}
                onChange={(e) => setFormData({ ...formData, expected_settlement: e.target.value })}
              />
            </div>
          </div>

          {/* Team Roles Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Assign Team Roles</h3>
              {membersLoading && (
                <p className="text-xs text-muted-foreground">Loading team members...</p>
              )}
              {!membersLoading && assignableMembers.length === 0 && (
                <p className="text-xs text-destructive">No team members available</p>
              )}
              {!membersLoading && assignableMembers.length === 1 && (
                <p className="text-xs text-muted-foreground">
                  Only you are available – you've been auto-assigned to required roles
                </p>
              )}
              {!membersLoading && assignableMembers.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAssignMeToAll}
                >
                  Assign me to all roles
                </Button>
              )}
            </div>
            
            {/* Lead Salesperson - Required */}
            <div className="space-y-2">
              <Label htmlFor="lead_salesperson">Lead Salesperson *</Label>
              <Select
                value={formData.assignees.lead_salesperson}
                onValueChange={(value) => handleRoleChange('lead_salesperson', value)}
                disabled={membersLoading || assignableMembers.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    membersLoading ? "Loading..." : 
                    assignableMembers.length === 0 ? "No members available" :
                    "Select lead salesperson"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {assignableMembers.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name || member.profiles?.full_name || member.email || member.profiles?.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Secondary Salesperson - Optional */}
            <div className="space-y-2">
              <Label htmlFor="secondary_salesperson">Secondary Salesperson</Label>
              <Select
                value={formData.assignees.secondary_salesperson || 'NONE'}
                onValueChange={(value) => handleRoleChange('secondary_salesperson', value)}
                disabled={membersLoading || assignableMembers.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    membersLoading ? "Loading..." :
                    assignableMembers.length === 0 ? "No members available" :
                    "None (optional)"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="NONE">None</SelectItem>
                  {assignableMembers.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name || member.profiles?.full_name || member.email || member.profiles?.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If no secondary is assigned, related tasks will go to lead salesperson
              </p>
            </div>

            {/* Admin - Required */}
            <div className="space-y-2">
              <Label htmlFor="admin">Admin *</Label>
              <Select
                value={formData.assignees.admin}
                onValueChange={(value) => handleRoleChange('admin', value)}
                disabled={membersLoading || assignableMembers.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    membersLoading ? "Loading..." :
                    assignableMembers.length === 0 ? "No members available" :
                    "Select admin"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {assignableMembers.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name || member.profiles?.full_name || member.email || member.profiles?.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Support - Optional */}
            <div className="space-y-2">
              <Label htmlFor="support">Support</Label>
              <Select
                value={formData.assignees.support || 'NONE'}
                onValueChange={(value) => handleRoleChange('support', value)}
                disabled={membersLoading || assignableMembers.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    membersLoading ? "Loading..." :
                    assignableMembers.length === 0 ? "No members available" :
                    "None (optional)"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="NONE">None</SelectItem>
                  {assignableMembers.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name || member.profiles?.full_name || member.email || member.profiles?.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If no support is assigned, related tasks will go to admin
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Listing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
