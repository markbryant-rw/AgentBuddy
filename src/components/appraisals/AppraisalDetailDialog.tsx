import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LoggedAppraisal, AppraisalOwner, useLoggedAppraisals } from '@/hooks/useLoggedAppraisals';
import { useLeadSources } from '@/hooks/useLeadSources';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/integrations/supabase/client';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConvertToOpportunityDialog from './ConvertToOpportunityDialog';
import LocationFixSection from '@/components/shared/LocationFixSection';
import { VisitTimeline } from './VisitTimeline';
import { AppraisalTasksTab } from './AppraisalTasksTab';
import { AppraisalNotesTab } from './AppraisalNotesTab';
import { BeaconReportButton } from './BeaconReportButton';
import { BeaconEngagementPanel } from './BeaconEngagementPanel';
import { BeaconTab } from './BeaconTab';
import { NewVisitDialog } from './NewVisitDialog';
import { AppraisalTemplatePromptDialog } from './AppraisalTemplatePromptDialog';
import { Trash2, Plus, ListTodo, FileText, TrendingUp, Activity, ArrowRightCircle, MessageSquare } from "lucide-react";
import { GoogleAddressAutocomplete, AddressResult } from '@/components/shared/GoogleAddressAutocomplete';
import { StageInfoTooltip } from './StageInfoTooltip';
import { OwnersEditor, Owner, legacyToOwners, ownersToLegacy, getPrimaryOwner } from '@/components/shared/OwnersEditor';
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
import { CurrencyInput } from '@/components/ui/currency-input';
import { format } from 'date-fns';
import { AppraisalStage } from '@/hooks/useAppraisalTemplates';

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
  const [syncContactsToAllVisits, setSyncContactsToAllVisits] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [showNewVisitDialog, setShowNewVisitDialog] = useState(false);
  const [showTemplatePrompt, setShowTemplatePrompt] = useState(false);
  const [createdAppraisalData, setCreatedAppraisalData] = useState<{
    id: string;
    appraisal_date: string;
    stage: AppraisalStage;
    agent_id?: string;
  } | null>(null);
  const originalFollowUpRef = useRef<string | null | undefined>(undefined);
  
  const [formData, setFormData] = useState<Partial<LoggedAppraisal>>({
    address: '',
    vendor_name: '',
    vendor_mobile: '',
    vendor_email: '',
    owners: [],
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
      // Initialize owners from either owners array or legacy fields
      const owners = legacyToOwners(
        appraisal.vendor_name,
        appraisal.vendor_email,
        appraisal.vendor_mobile,
        appraisal.owners as Owner[]
      );
      setFormData({ ...appraisal, owners });
      originalFollowUpRef.current = appraisal.next_follow_up;
    } else if (isNew) {
      setFormData({
        address: '',
        vendor_name: '',
        vendor_mobile: '',
        vendor_email: '',
        owners: [],
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
      originalFollowUpRef.current = undefined;
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
      
      let savedAppraisalId = appraisal?.id;
      
      if (isNew) {
        const result = await addAppraisal(sanitizedData as any);
        if (!result) {
          toast({
            title: "Error",
            description: "Failed to log appraisal - please try again",
            variant: "destructive",
          });
          return;
        }
        savedAppraisalId = result.id;
        toast({
          title: "Success",
          description: "Appraisal logged successfully",
        });
        
        // Show template prompt for new appraisals
        setCreatedAppraisalData({
          id: result.id,
          appraisal_date: sanitizedData.appraisal_date || new Date().toISOString().split('T')[0],
          stage: (sanitizedData.stage as AppraisalStage) || 'VAP',
          agent_id: sanitizedData.agent_id,
        });
        setShowTemplatePrompt(true);
        return; // Don't close dialog yet - template prompt will handle it
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
      
      // Create follow-up task if next_follow_up was set or changed
      const followUpChanged = formData.next_follow_up && formData.next_follow_up !== originalFollowUpRef.current;
      if (followUpChanged && savedAppraisalId && team?.id) {
        // Check if a follow-up task already exists for this date
        const { data: existingTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('appraisal_id', savedAppraisalId)
          .ilike('title', '%Follow up%')
          .eq('due_date', formData.next_follow_up);
        
        if (!existingTasks?.length) {
          await supabase.from('tasks').insert({
            title: `Follow up: ${formData.address}`,
            section: 'Follow-ups',
            due_date: formData.next_follow_up,
            appraisal_id: savedAppraisalId,
            appraisal_stage: formData.stage || 'VAP',
            assigned_to: formData.agent_id || user?.id,
            team_id: team.id,
            created_by: user?.id,
            source: 'appraisal',
          });
          // Invalidate queries so the task shows in My Assignments
          queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['appraisal-tasks', savedAppraisalId] });
          toast({
            title: "Follow-up task created",
            description: `Task scheduled for ${format(new Date(formData.next_follow_up), 'MMM d, yyyy')}`,
          });
        }
      }
      
      // Close the dialog after successful save
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
    setShowNewVisitDialog(true);
  };

  const handleConfirmNewVisit = async (data: {
    appraisal_date: string;
    stage: 'VAP' | 'MAP' | 'LAP';
    intent: 'low' | 'medium' | 'high';
  }) => {
    if (!appraisal || !team?.id) return;
    
    // Create new appraisal with inherited property details + user choices
    const newVisitData = {
      address: appraisal.address,
      vendor_name: appraisal.vendor_name,
      vendor_mobile: appraisal.vendor_mobile,
      vendor_email: appraisal.vendor_email,
      suburb: appraisal.suburb,
      latitude: appraisal.latitude,
      longitude: appraisal.longitude,
      appraisal_date: data.appraisal_date,
      intent: data.intent,
      stage: data.stage,
      outcome: 'In Progress' as const,
      estimated_value: appraisal.estimated_value,
      last_contact: data.appraisal_date,
      next_follow_up: null,
      lead_source: appraisal.lead_source,
      notes: '',
      agent_id: user?.id,
      team_id: team.id,
    };
    
    const result = await addAppraisal(newVisitData as any);
    if (result) {
      toast({ 
        title: "New visit logged", 
        description: `${data.stage} visit logged for ${appraisal.address}`,
      });
      // Close current dialog - user can reopen from list if needed
      onOpenChange(false);
    } else {
      throw new Error('Failed to create visit');
    }
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {isNew ? 'Log New Appraisal' : appraisal?.address || 'Appraisal Details'}
            </DialogTitle>
            <DialogDescription>
              {isNew 
                ? 'Enter the details of the appraisal you conducted' 
                : appraisal?.suburb || 'View and edit appraisal information'}
            </DialogDescription>
          </DialogHeader>

          {/* Tabs for existing appraisals */}
          {!isNew && appraisal ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="tracking" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tracking
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notes
                </TabsTrigger>
                <TabsTrigger value="beacon" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Beacon
                </TabsTrigger>
              </TabsList>

              {/* Details Tab - Property, Appraisal Info, Notes */}
              <TabsContent value="details" className="mt-4 space-y-6">
                {/* Property Details */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                  <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Property Details</h3>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Property Address <span className="text-destructive">*</span></Label>
                    <GoogleAddressAutocomplete
                      placeholder="Start typing address..."
                      defaultValue={formData.address || ''}
                      onSelect={(result: AddressResult) => {
                        setFormData(prev => ({
                          ...prev,
                          address: result.address,
                          suburb: result.suburb || prev.suburb,
                          latitude: result.latitude,
                          longitude: result.longitude,
                        }));
                      }}
                      showSuburbOverride={true}
                      currentSuburb={formData.suburb || ''}
                      onSuburbChange={(suburb) => setFormData(prev => ({ ...prev, suburb }))}
                    />
                  </div>
                  
                  {/* Multi-Owner Editor */}
                  <OwnersEditor
                    owners={(formData.owners as Owner[]) || []}
                    onChange={(owners) => {
                      // Sync primary owner to legacy fields for backward compatibility
                      const legacy = ownersToLegacy(owners);
                      setFormData({ 
                        ...formData, 
                        owners,
                        vendor_name: legacy.vendor_name,
                        vendor_email: legacy.vendor_email,
                        vendor_mobile: legacy.vendor_mobile,
                      });
                    }}
                    showBeaconSync={!!appraisal?.beacon_report_id}
                  />
                  
                  {/* Fix Location Section */}
                  <LocationFixSection entityId={appraisal.id} entityType="appraisal" address={formData.address || ''} suburb={formData.suburb || undefined} latitude={formData.latitude} longitude={formData.longitude} geocodeError={formData.geocode_error} geocodedAt={formData.geocoded_at} onLocationUpdated={handleLocationUpdated} />
                </div>

                {/* Appraisal Information */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                  <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Appraisal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="appraisal_date" className="text-sm font-medium">Appraisal Date <span className="text-destructive">*</span></Label>
                      <Input id="appraisal_date" type="date" value={formData.appraisal_date} onChange={(e) => setFormData({ ...formData, appraisal_date: e.target.value })} required className="h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agent_id" className="text-sm font-medium">Appraised By</Label>
                      <Select value={formData.agent_id || ''} onValueChange={(value) => setFormData({ ...formData, agent_id: value })}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select agent">
                            {formData.agent_id && members.find(m => m.user_id === formData.agent_id) && (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={members.find(m => m.user_id === formData.agent_id)?.avatar_url} />
                                  <AvatarFallback className="text-xs">{getInitials(members.find(m => m.user_id === formData.agent_id)?.full_name)}</AvatarFallback>
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
                      <CurrencyInput id="estimated_value" value={formData.estimated_value} onChange={(value) => setFormData({ ...formData, estimated_value: value })} placeholder="$1,200,000" className="h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lead_source" className="text-sm font-medium">Lead Source</Label>
                      <Select value={formData.lead_source || ''} onValueChange={(value) => setFormData({ ...formData, lead_source: value })}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select lead source" /></SelectTrigger>
                        <SelectContent>
                          {activeLeadSources.map((source) => (<SelectItem key={source.id} value={source.value}>{source.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

              </TabsContent>

              {/* Tracking Tab - Progress, Visit Timeline, Location Fix */}
              <TabsContent value="tracking" className="mt-4 space-y-6">
                {/* Progress */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                  <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Progress</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stage" className="text-sm font-medium flex items-center gap-2">
                        Stage <span className="text-destructive">*</span>
                        <StageInfoTooltip stage={formData.stage as 'VAP' | 'MAP' | 'LAP'} />
                      </Label>
                      <Select value={formData.stage} onValueChange={(value: 'VAP' | 'MAP' | 'LAP') => setFormData({ ...formData, stage: value })}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VAP">
                            <div className="flex items-center gap-2">VAP <StageInfoTooltip stage="VAP" /></div>
                          </SelectItem>
                          <SelectItem value="MAP">
                            <div className="flex items-center gap-2">MAP <StageInfoTooltip stage="MAP" /></div>
                          </SelectItem>
                          <SelectItem value="LAP">
                            <div className="flex items-center gap-2">LAP <StageInfoTooltip stage="LAP" /></div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="outcome" className="text-sm font-medium">Outcome</Label>
                      <Select value={formData.outcome} onValueChange={(value: 'In Progress' | 'WON' | 'LOST') => setFormData({ ...formData, outcome: value })}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="WON">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-emerald-700">WON</span>
                            </span>
                          </SelectItem>
                          <SelectItem value="LOST">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              <span className="text-red-700">LOST</span>
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="intent" className="text-sm font-medium">Intent <span className="text-destructive">*</span></Label>
                      <Select value={formData.intent || 'medium'} onValueChange={(value: any) => setFormData({ ...formData, intent: value })}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Contact Tracking */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                  <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
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

                {/* Visit Timeline */}
                {allVisitsAtAddress.length > 0 && (
                  <VisitTimeline 
                    visits={allVisitsAtAddress} 
                    currentVisitId={appraisal?.id}
                    onVisitDeleted={() => {
                      // If current visit was deleted, close dialog
                      queryClient.invalidateQueries({ queryKey: ['logged_appraisals'] });
                    }}
                  />
                )}

                {/* Sync contact details option */}
                {hasMultipleVisits && (
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Checkbox id="sync-contacts" checked={syncContactsToAllVisits} onCheckedChange={(checked) => setSyncContactsToAllVisits(checked as boolean)} />
                    <label htmlFor="sync-contacts" className="text-sm font-medium leading-none">Sync contact details to all {allVisitsAtAddress.length} visits at this address</label>
                  </div>
                )}
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="mt-4">
                <AppraisalTasksTab
                  appraisalId={appraisal.id}
                  appraisalDate={formData.appraisal_date || appraisal.appraisal_date}
                  stage={(formData.stage || appraisal.stage || 'VAP') as AppraisalStage}
                  agentId={formData.agent_id || appraisal.agent_id || undefined}
                />
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="mt-4">
                <AppraisalNotesTab appraisalId={appraisal.id} />
              </TabsContent>

              {/* Beacon Tab */}
              <TabsContent value="beacon" className="mt-4">
                <BeaconTab appraisal={appraisal} />
              </TabsContent>
            </Tabs>
          ) : (
            /* New appraisal form - no tabs */
            <div className="space-y-6 py-4">
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Property Details</h3>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Property Address <span className="text-destructive">*</span></Label>
                  <GoogleAddressAutocomplete
                    placeholder="Start typing address..."
                    defaultValue=""
                    onSelect={(result: AddressResult) => {
                      setFormData(prev => ({
                        ...prev,
                        address: result.address,
                        suburb: result.suburb || prev.suburb,
                        latitude: result.latitude,
                        longitude: result.longitude,
                      }));
                    }}
                    showSuburbOverride={true}
                    currentSuburb={formData.suburb || ''}
                    onSuburbChange={(suburb) => setFormData(prev => ({ ...prev, suburb }))}
                  />
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
                    <Select value={formData.agent_id || ''} onValueChange={(value) => setFormData({ ...formData, agent_id: value })}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select agent">
                          {formData.agent_id && members.find(m => m.user_id === formData.agent_id) && (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={members.find(m => m.user_id === formData.agent_id)?.avatar_url} />
                                <AvatarFallback className="text-xs">{getInitials(members.find(m => m.user_id === formData.agent_id)?.full_name)}</AvatarFallback>
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
                    <CurrencyInput id="estimated_value" value={formData.estimated_value} onChange={(value) => setFormData({ ...formData, estimated_value: value })} placeholder="$1,200,000" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead_source" className="text-sm font-medium">Lead Source</Label>
                    <Select value={formData.lead_source || ''} onValueChange={(value) => setFormData({ ...formData, lead_source: value })}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select lead source" /></SelectTrigger>
                      <SelectContent>
                        {activeLeadSources.map((source) => (<SelectItem key={source.id} value={source.value}>{source.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Tracking</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stage" className="text-sm font-medium flex items-center gap-2">
                      Stage <span className="text-destructive">*</span>
                      <StageInfoTooltip stage={formData.stage as 'VAP' | 'MAP' | 'LAP'} />
                    </Label>
                    <Select value={formData.stage} onValueChange={(value: 'VAP' | 'MAP' | 'LAP') => setFormData({ ...formData, stage: value })}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VAP">
                          <div className="flex items-center gap-2">VAP <StageInfoTooltip stage="VAP" /></div>
                        </SelectItem>
                        <SelectItem value="MAP">
                          <div className="flex items-center gap-2">MAP <StageInfoTooltip stage="MAP" /></div>
                        </SelectItem>
                        <SelectItem value="LAP">
                          <div className="flex items-center gap-2">LAP <StageInfoTooltip stage="LAP" /></div>
                        </SelectItem>
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
                <Textarea id="notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Add any additional notes about this appraisal..." rows={4} className="resize-none" />
              </div>
            </div>
          )}

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
                <Button 
                  type="button" 
                  onClick={handleConvert} 
                  disabled={isDeleting || isSaving} 
                  className="px-8 py-5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold text-base shadow-lg"
                >
                  <ArrowRightCircle className="h-5 w-5 mr-2" />
                  Convert to Opportunity
                </Button>
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
      
      {appraisal && (
        <NewVisitDialog
          open={showNewVisitDialog}
          onOpenChange={setShowNewVisitDialog}
          parentAppraisal={appraisal}
          onConfirm={handleConfirmNewVisit}
        />
      )}

      {/* Template prompt for new appraisals */}
      {createdAppraisalData && (
        <AppraisalTemplatePromptDialog
          isOpen={showTemplatePrompt}
          onClose={() => {
            setShowTemplatePrompt(false);
            setCreatedAppraisalData(null);
            onOpenChange(false);
          }}
          onComplete={() => {
            setShowTemplatePrompt(false);
            setCreatedAppraisalData(null);
            onOpenChange(false);
          }}
          appraisalId={createdAppraisalData.id}
          appraisalDate={createdAppraisalData.appraisal_date}
          targetStage={createdAppraisalData.stage}
          agentId={createdAppraisalData.agent_id}
        />
      )}
    </>
  );
};

export default AppraisalDetailDialog;
