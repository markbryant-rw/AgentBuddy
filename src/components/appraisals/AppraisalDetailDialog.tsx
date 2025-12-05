import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LoggedAppraisal, useLoggedAppraisals } from '@/hooks/useLoggedAppraisals';
import { useLeadSources } from '@/hooks/useLeadSources';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import ConvertToOpportunityDialog from './ConvertToOpportunityDialog';
import LocationFixSection from '@/components/shared/LocationFixSection';
import { VisitTimeline } from './VisitTimeline';
import { Trash2, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyFull, parseCurrency } from "@/lib/currencyUtils";
import { format } from 'date-fns';

interface AppraisalDetailDialogProps {
  appraisal: LoggedAppraisal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isNew?: boolean;
}

const AppraisalDetailDialog = ({
  appraisal,
  open,
  onOpenChange,
  isNew = false,
}: AppraisalDetailDialogProps) => {
  const queryClient = useQueryClient();
  const { team } = useTeam();
  const { addAppraisal, updateAppraisal, updateAppraisalWithSync, deleteAppraisal, getAppraisalsAtAddress } = useLoggedAppraisals();
  const { activeLeadSources } = useLeadSources();
  const { members } = useTeamMembers();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [estimatedValueDisplay, setEstimatedValueDisplay] = useState("");
  const [syncContactsToAllVisits, setSyncContactsToAllVisits] = useState(false);
  const [formData, setFormData] = useState<Partial<LoggedAppraisal>>({
    address: '',
    vendor_name: '',
    vendor_mobile: '',
    vendor_email: '',
    suburb: '',
    appraisal_date: new Date().toISOString().split('T')[0],
    intent: 'medium',
    stage: 'VAP',
    outcome: 'In Progress',
    estimated_value: undefined,
    last_contact: new Date().toISOString().split('T')[0],
    next_follow_up: '',
    lead_source: undefined,
    notes: '',
    agent_id: undefined,
  });

  // Get all visits at this address for the timeline
  const allVisitsAtAddress = appraisal && !isNew 
    ? getAppraisalsAtAddress(appraisal.address)
    : [];
  
  const hasMultipleVisits = allVisitsAtAddress.length > 1;

  useEffect(() => {
    if (appraisal && !isNew) {
      setFormData(appraisal);
      setEstimatedValueDisplay(appraisal.estimated_value ? formatCurrencyFull(appraisal.estimated_value) : "");
    } else if (isNew) {
      setFormData({
        address: '',
        vendor_name: '',
        vendor_mobile: '',
        vendor_email: '',
        suburb: '',
        appraisal_date: new Date().toISOString().split('T')[0],
        intent: 'medium',
        stage: 'VAP',
        outcome: 'In Progress',
        estimated_value: undefined,
        last_contact: new Date().toISOString().split('T')[0],
        next_follow_up: '',
        lead_source: undefined,
        notes: '',
        agent_id: user?.id,
      });
      setEstimatedValueDisplay("");
    }
  }, [appraisal, isNew, user?.id]);

  // Auto-set stage and intent when outcome changes to WON
  useEffect(() => {
    if (formData.outcome === 'WON') {
      setFormData(prev => ({
        ...prev,
        stage: 'LAP',
        intent: 'high',
      }));
    }
  }, [formData.outcome]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Strip non-database fields before sending
      const { agent, visit_number, ...dbFields } = formData as any;
      
      const sanitizedData = {
        ...dbFields,
        next_follow_up: dbFields.next_follow_up || null,
        last_contact: dbFields.last_contact || null,
        converted_date: dbFields.converted_date || null,
      };
      
      if (isNew) {
        await addAppraisal(sanitizedData as any);
        toast({
          title: "Success",
          description: "Appraisal logged successfully",
        });
      } else if (appraisal) {
        // Use sync version if checkbox is checked and there are multiple visits
        if (syncContactsToAllVisits && hasMultipleVisits) {
          await updateAppraisalWithSync(appraisal.id, sanitizedData, true);
        } else {
          await updateAppraisal(appraisal.id, sanitizedData);
        }
        toast({
          title: "Success",
          description: "Appraisal updated successfully",
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: `Failed to ${isNew ? 'log' : 'update'} appraisal`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogNewVisit = () => {
    if (!appraisal) return;
    // Pre-fill form with address and vendor details from current appraisal
    setFormData({
      address: appraisal.address,
      vendor_name: appraisal.vendor_name,
      vendor_mobile: appraisal.vendor_mobile,
      vendor_email: appraisal.vendor_email,
      suburb: appraisal.suburb,
      latitude: appraisal.latitude,
      longitude: appraisal.longitude,
      appraisal_date: new Date().toISOString().split('T')[0],
      intent: 'medium',
      stage: 'VAP',
      outcome: 'In Progress',
      estimated_value: appraisal.estimated_value,
      last_contact: new Date().toISOString().split('T')[0],
      next_follow_up: '',
      lead_source: appraisal.lead_source,
      notes: '',
      agent_id: user?.id,
    });
    setEstimatedValueDisplay(appraisal.estimated_value ? formatCurrencyFull(appraisal.estimated_value) : "");
    // This will trigger a re-render with isNew behavior
    // We need to handle this differently - open a new dialog or switch mode
  };

  const handleLocationUpdated = (data: { address: string; suburb: string; latitude: number; longitude: number }) => {
    // Update local form data with new coordinates
    setFormData(prev => ({
      ...prev,
      address: data.address,
      suburb: data.suburb,
      latitude: data.latitude,
      longitude: data.longitude,
      geocode_error: null,
      geocoded_at: new Date().toISOString(),
    }));
    // Invalidate cache to refresh map and list views
    queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team?.id] });
  };

  const handleConvert = () => {
    setShowConvertDialog(true);
  };

  const handleDelete = async () => {
    if (!appraisal?.id) return;
    setIsDeleting(true);
    try {
      await deleteAppraisal(appraisal.id);
      toast({
        title: "Success",
        description: "Appraisal deleted successfully",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete appraisal",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {isNew ? 'Log New Appraisal' : 'Appraisal Details'}
            </DialogTitle>
            <DialogDescription>
              {isNew ? 'Enter the details of the appraisal you conducted' : 'View and edit appraisal information'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4 p-4 rounded-lg bg-muted/50">
              <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Property Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">Address <span className="text-destructive">*</span></Label>
                  <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Main Street" required className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suburb" className="text-sm font-medium">Suburb <span className="text-destructive">*</span></Label>
                  <Input id="suburb" value={formData.suburb || ''} onChange={(e) => setFormData({ ...formData, suburb: e.target.value })} placeholder="Auckland Central" required className="h-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor_name" className="text-sm font-medium">Vendor Name <span className="text-destructive">*</span></Label>
                <Input id="vendor_name" value={formData.vendor_name} onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })} placeholder="John Smith" required className="h-10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor_mobile" className="text-sm font-medium">Vendor Mobile</Label>
                  <Input id="vendor_mobile" value={formData.vendor_mobile || ''} onChange={(e) => setFormData({ ...formData, vendor_mobile: e.target.value })} placeholder="021 123 4567" className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor_email" className="text-sm font-medium">Vendor Email</Label>
                  <Input id="vendor_email" type="email" value={formData.vendor_email || ''} onChange={(e) => setFormData({ ...formData, vendor_email: e.target.value })} placeholder="john@example.com" className="h-10" />
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-lg bg-muted/50">
              <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Appraisal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appraisal_date" className="text-sm font-medium">Appraisal Date <span className="text-destructive">*</span></Label>
                  <Input id="appraisal_date" type="date" value={formData.appraisal_date} onChange={(e) => setFormData({ ...formData, appraisal_date: e.target.value })} required className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent_id" className="text-sm font-medium">Appraised By</Label>
                  <Select
                    value={formData.agent_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, agent_id: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select agent">
                        {formData.agent_id && members.find(m => m.user_id === formData.agent_id) && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={members.find(m => m.user_id === formData.agent_id)?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {getInitials(members.find(m => m.user_id === formData.agent_id)?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{members.find(m => m.user_id === formData.agent_id)?.full_name}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={member.avatar_url} />
                              <AvatarFallback className="text-xs">{getInitials(member.full_name)}</AvatarFallback>
                            </Avatar>
                            <span>{member.full_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_value" className="text-sm font-medium">Estimated Value</Label>
                  <Input 
                    id="estimated_value" 
                    value={estimatedValueDisplay}
                    onChange={(e) => {
                      setEstimatedValueDisplay(e.target.value);
                      const parsed = parseCurrency(e.target.value);
                      setFormData({ ...formData, estimated_value: parsed });
                    }}
                    onBlur={() => {
                      if (formData.estimated_value) {
                        setEstimatedValueDisplay(formatCurrencyFull(formData.estimated_value));
                      }
                    }}
                    placeholder="$1,200,000" 
                    className="h-10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead_source" className="text-sm font-medium">Lead Source</Label>
                  <Select
                    value={formData.lead_source || ''}
                    onValueChange={(value) => setFormData({ ...formData, lead_source: value })}
                  >
                    <SelectTrigger className="h-10">
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

            <div className="space-y-4 p-4 rounded-lg bg-muted/50">
              <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Tracking</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stage" className="text-sm font-medium">Stage <span className="text-destructive">*</span></Label>
                  <Select value={formData.stage} onValueChange={(value: 'VAP' | 'MAP' | 'LAP') => setFormData({ ...formData, stage: value })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[60]">
                      <SelectItem value="VAP">VAP</SelectItem>
                      <SelectItem value="MAP">MAP</SelectItem>
                      <SelectItem value="LAP">LAP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outcome" className="text-sm font-medium">Outcome</Label>
                  <Select value={formData.outcome} onValueChange={(value: 'In Progress' | 'WON' | 'LOST') => setFormData({ ...formData, outcome: value })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="WON">WON</SelectItem>
                      <SelectItem value="LOST">LOST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intent" className="text-sm font-medium">Intent <span className="text-destructive">*</span></Label>
                  <Select value={formData.intent || 'medium'} onValueChange={(value: any) => setFormData({ ...formData, intent: value })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Exploring options</SelectItem>
                      <SelectItem value="medium">Medium - Seriously considering</SelectItem>
                      <SelectItem value="high">High - Ready to list soon</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">How serious is the vendor about listing?</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_contact" className="text-sm font-medium">Last Contact</Label>
                  <Input id="last_contact" type="date" value={formData.last_contact || ''} onChange={(e) => setFormData({ ...formData, last_contact: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next_follow_up" className="text-sm font-medium">Next Follow-up</Label>
                  <Input id="next_follow_up" type="date" value={formData.next_follow_up || ''} onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })} className="h-10" />
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-lg bg-muted/50">
              <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Notes</h3>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Additional Notes</Label>
                <Textarea id="notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Add any additional notes about this appraisal..." rows={4} className="resize-none" />
              </div>
            </div>

            {/* Fix Location Section - only show for existing appraisals */}
            {!isNew && appraisal && (
              <LocationFixSection
                entityId={appraisal.id}
                entityType="appraisal"
                address={formData.address || ''}
                suburb={formData.suburb || undefined}
                latitude={formData.latitude}
                longitude={formData.longitude}
                geocodeError={formData.geocode_error}
                geocodedAt={formData.geocoded_at}
                onLocationUpdated={handleLocationUpdated}
              />
            )}

            {/* Visit Timeline - always visible for existing appraisals with multiple visits */}
            {!isNew && allVisitsAtAddress.length > 0 && (
              <VisitTimeline
                visits={allVisitsAtAddress}
                currentVisitId={appraisal?.id}
              />
            )}

            {/* Sync contact details option */}
            {!isNew && hasMultipleVisits && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Checkbox
                  id="sync-contacts"
                  checked={syncContactsToAllVisits}
                  onCheckedChange={(checked) => setSyncContactsToAllVisits(checked as boolean)}
                />
                <label
                  htmlFor="sync-contacts"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Sync contact details to all {allVisitsAtAddress.length} visits at this address
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-between gap-3 pt-6 border-t">
            <div className="flex gap-2">
              {appraisal && !isNew && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="px-6"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              {appraisal && !isNew && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogNewVisit}
                  disabled={isDeleting || isSaving}
                  className="px-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Log New Visit
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting || isSaving} className="px-6">Cancel</Button>
              {appraisal && appraisal.outcome === 'In Progress' && !isNew && (
                <Button type="button" variant="secondary" onClick={handleConvert} disabled={isDeleting || isSaving} className="px-6">Convert to Opportunity</Button>
              )}
              <Button type="button" onClick={handleSave} disabled={isDeleting || isSaving} className="px-6">
                {isSaving ? 'Saving...' : (isNew ? 'Log Appraisal' : 'Save Changes')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-[11001]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appraisal</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this appraisal. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {appraisal && <ConvertToOpportunityDialog appraisal={appraisal} open={showConvertDialog} onOpenChange={setShowConvertDialog} />}
    </>
  );
};

export default AppraisalDetailDialog;
