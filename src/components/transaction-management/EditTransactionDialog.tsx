import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Transaction, TransactionStage, TransactionWarmth } from '@/hooks/useTransactions';
import { PriceAlignmentIndicator } from './PriceAlignmentIndicator';
import { useAssignableTeamMembers } from '@/hooks/useAssignableTeamMembers';
import { useLeadSources } from '@/hooks/useLeadSources';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

interface EditTransactionDialogProps {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<Transaction>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const getVisibleDateFields = (stage: TransactionStage) => {
  switch (stage) {
    case 'signed':
      return ['listing_signed_date', 'photoshoot_date', 'building_report_date', 'live_date'];
    case 'live':
      return ['live_date', 'auction_deadline_date', 'listing_expires_date'];
    case 'contract':
      return ['contract_date', 'unconditional_date'];
    case 'unconditional':
      return ['pre_settlement_inspection_date', 'settlement_date'];
    case 'settled':
      return ['settlement_date'];
    default:
      return [];
  }
};

const dateFieldLabels: Record<string, string> = {
  listing_signed_date: 'Listing Signed',
  photoshoot_date: 'Photoshoot',
  building_report_date: 'Building Report',
  live_date: 'Listing LIVE',
  auction_deadline_date: 'Auction/Deadline',
  listing_expires_date: 'Listing Expires',
  contract_date: 'Under Contract',
  unconditional_date: 'Unconditional',
  pre_settlement_inspection_date: 'Pre-Settlement Inspection',
  settlement_date: 'Settlement',
};

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: EditTransactionDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { assignableMembers, isLoading: membersLoading } = useAssignableTeamMembers();
  const { activeLeadSources } = useLeadSources();
  const [formData, setFormData] = useState<Partial<Transaction>>(transaction);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync form data when transaction prop changes
  useEffect(() => {
    setFormData(transaction);
  }, [transaction]);

  const visibleDateFields = getVisibleDateFields(formData.stage || transaction.stage);

  const handleRoleChange = (role: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      assignees: {
        ...(prev.assignees || {}),
        [role]: value === 'NONE' ? null : value
      }
    }));
  };

  const handleAssignMeToAll = () => {
    if (!user?.id) return;
    setFormData(prev => ({
      ...prev,
      assignees: {
        lead_salesperson: user.id,
        secondary_salesperson: user.id,
        admin: user.id,
        support: user.id,
      }
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { id, created_at, updated_at, created_by, team_id, ...updates } = formData;
      await onSave(transaction.id, updates);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${transaction.address}?\n\nThis action cannot be undone and will permanently remove all associated tasks, comments, and data.`
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    try {
      await onDelete(transaction.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setIsDeleting(false);
    }
  };

  const handleDateChange = (field: string, date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: date ? format(date, 'yyyy-MM-dd') : null,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={transaction.id} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb</Label>
                <Input
                  id="suburb"
                  value={formData.suburb || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, suburb: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Client Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name *</Label>
                <Input
                  id="client_name"
                  value={formData.client_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_email">Client Email</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={formData.client_email || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_phone">Client Phone</Label>
                <Input
                  id="client_phone"
                  value={formData.client_phone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead_source">Lead Source</Label>
                <Select
                  value={formData.lead_source || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, lead_source: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead source" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLeadSources.map((source) => (
                      <SelectItem key={source.id} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Pricing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor_price">Vendor Price</Label>
                <Input
                  id="vendor_price"
                  type="number"
                  placeholder="$"
                  value={formData.vendor_price || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    vendor_price: parseFloat(e.target.value) || undefined 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Vendor's desired price
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team_price">Team Price</Label>
                <Input
                  id="team_price"
                  type="number"
                  placeholder="$"
                  value={formData.team_price || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    team_price: parseFloat(e.target.value) || undefined 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Agent's valuation
                </p>
              </div>
            </div>
            
            {/* Live Alignment Indicator */}
            {formData.vendor_price && formData.team_price && (
              <PriceAlignmentIndicator 
                vendorPrice={formData.vendor_price}
                teamPrice={formData.team_price}
              />
            )}
          </div>

          {/* Stage & Warmth */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={formData.stage || transaction.stage}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, stage: value as TransactionStage }))}
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
              <div className="space-y-2">
                <Label htmlFor="warmth">Warmth</Label>
                <Select
                  value={formData.warmth || transaction.warmth}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, warmth: value as TransactionWarmth }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Stage-Specific Key Dates */}
          {visibleDateFields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Key Dates</h3>
              <div className="grid grid-cols-2 gap-4">
                {visibleDateFields.map((field) => {
                  const dateValue = formData[field as keyof Transaction] as string | undefined;
                  return (
                    <div key={field} className="space-y-2">
                      <Label>{dateFieldLabels[field]}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !dateValue && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateValue ? format(new Date(dateValue), 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateValue ? new Date(dateValue) : undefined}
                            onSelect={(date) => handleDateChange(field, date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Team Roles */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Team Roles</h3>
              <Button variant="ghost" size="sm" onClick={handleAssignMeToAll}>
                Assign me to all roles
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead Salesperson</Label>
                <Select
                  value={formData.assignees?.lead_salesperson || 'NONE'}
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
                    <SelectItem value="NONE">None</SelectItem>
                    {assignableMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Secondary Salesperson</Label>
                <Select
                  value={formData.assignees?.secondary_salesperson || 'NONE'}
                  onValueChange={(value) => handleRoleChange('secondary_salesperson', value)}
                  disabled={membersLoading || assignableMembers.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      membersLoading ? "Loading..." :
                      assignableMembers.length === 0 ? "No members available" :
                      "Select secondary salesperson"
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="NONE">None</SelectItem>
                    {assignableMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Admin</Label>
                <Select
                  value={formData.assignees?.admin || 'NONE'}
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
                    <SelectItem value="NONE">None</SelectItem>
                    {assignableMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Support</Label>
                <Select
                  value={formData.assignees?.support || 'NONE'}
                  onValueChange={(value) => handleRoleChange('support', value)}
                  disabled={membersLoading || assignableMembers.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      membersLoading ? "Loading..." :
                      assignableMembers.length === 0 ? "No members available" :
                      "Select support"
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="NONE">None</SelectItem>
                    {assignableMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={4}
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between w-full pt-4 border-t">
          {/* Left side - Delete button */}
          {onDelete && (
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isLoading || isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}

          {/* Right side - Cancel & Save buttons */}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading || isDeleting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading || isDeleting}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
