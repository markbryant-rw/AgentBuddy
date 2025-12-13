import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useLeadSources } from '@/hooks/useLeadSources';
import { useLoggedAppraisals, LoggedAppraisal, AppraisalOwner } from '@/hooks/useLoggedAppraisals';
import { useAppraisalTemplates, AppraisalStage } from '@/hooks/useAppraisalTemplates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GoogleAddressAutocomplete, AddressResult } from '@/components/shared/GoogleAddressAutocomplete';
import { OwnersEditor, Owner, ownersToLegacy } from '@/components/shared/OwnersEditor';
import { StageInfoTooltip } from './StageInfoTooltip';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Calendar, Clock, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

interface BookAppraisalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (appraisal: any) => void;
}

type AppointmentType = 'appraisal' | 'follow_up' | 'listing_presentation';

const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  appraisal: 'Appraisal',
  follow_up: 'Follow-Up Meeting',
  listing_presentation: 'Listing Presentation',
};

export const BookAppraisalDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: BookAppraisalDialogProps) => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { members } = useTeamMembers();
  const { activeLeadSources } = useLeadSources();
  const { addAppraisal } = useLoggedAppraisals();
  const { getEffectiveTemplate, applyTemplate: applyTemplateMutation } = useAppraisalTemplates();
  
  const [isSaving, setIsSaving] = useState(false);
  const [applyPrepTemplate, setApplyPrepTemplate] = useState(true);
  
  const [formData, setFormData] = useState({
    address: '',
    suburb: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    owners: [] as Owner[],
    appointment_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    appointment_time: '10:00',
    appointment_type: 'appraisal' as AppointmentType,
    stage: 'MAP' as AppraisalStage,
    estimated_value: undefined as number | undefined,
    lead_source: undefined as string | undefined,
    agent_id: user?.id,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        address: '',
        suburb: '',
        latitude: undefined,
        longitude: undefined,
        owners: [],
        appointment_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        appointment_time: '10:00',
        appointment_type: 'appraisal',
        stage: 'MAP',
        estimated_value: undefined,
        lead_source: undefined,
        agent_id: user?.id,
      });
    }
  }, [open, user?.id]);

  const handleSave = async () => {
    if (!formData.address) {
      toast.error('Please enter an address');
      return;
    }
    if (!team?.id) {
      toast.error('No team found');
      return;
    }

    setIsSaving(true);
    try {
      // Get legacy fields from owners
      const legacy = ownersToLegacy(formData.owners);
      
      const appraisalData: Partial<LoggedAppraisal> = {
        address: formData.address,
        suburb: formData.suburb,
        latitude: formData.latitude,
        longitude: formData.longitude,
        vendor_name: legacy.vendor_name,
        vendor_email: legacy.vendor_email,
        vendor_mobile: legacy.vendor_mobile,
        owners: formData.owners as AppraisalOwner[],
        appraisal_date: formData.appointment_date,
        stage: formData.stage,
        intent: 'medium',
        outcome: 'In Progress',
        estimated_value: formData.estimated_value,
        lead_source: formData.lead_source,
        agent_id: formData.agent_id,
        // Booking-specific fields (will be added to the database)
        appointment_status: 'booked',
        appointment_type: formData.appointment_type,
        appointment_time: formData.appointment_time,
        booked_at: new Date().toISOString(),
      } as any;

      const result = await addAppraisal(appraisalData as any);
      
      if (result) {
        // Apply preparation template if checkbox is checked
        if (applyPrepTemplate) {
          const effectiveTemplate = getEffectiveTemplate(formData.stage);
          if (effectiveTemplate) {
            await applyTemplateMutation.mutateAsync({
              templateId: effectiveTemplate.id,
              appraisalId: result.id,
              appraisalDate: formData.appointment_date,
              agentId: formData.agent_id,
            });
            toast.success(`Appointment booked with ${effectiveTemplate.tasks.length} prep tasks`);
          } else {
            toast.success('Appointment booked successfully');
          }
        } else {
          toast.success('Appointment booked successfully');
        }
        
        onSuccess?.(result);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error booking appraisal:', error);
      toast.error('Failed to book appointment');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <CalendarPlus className="h-6 w-6 text-amber-500" />
            Book Appointment
          </DialogTitle>
          <DialogDescription>
            Schedule a future appraisal, follow-up, or listing presentation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Appointment Type & Date/Time */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-4">
            <h3 className="text-sm font-semibold text-amber-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointment Details
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.appointment_type}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    appointment_type: value as AppointmentType,
                    // Auto-set stage based on type
                    stage: value === 'listing_presentation' ? 'LAP' : value === 'follow_up' ? 'MAP' : 'MAP',
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appraisal">Appraisal</SelectItem>
                    <SelectItem value="follow_up">Follow-Up Meeting</SelectItem>
                    <SelectItem value="listing_presentation">Listing Presentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.appointment_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Time
                </Label>
                <Input
                  type="time"
                  value={formData.appointment_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, appointment_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Stage <StageInfoTooltip stage={formData.stage} />
                </Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, stage: value as AppraisalStage }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VAP">VAP - Virtual Appraisal</SelectItem>
                    <SelectItem value="MAP">MAP - Market Appraisal</SelectItem>
                    <SelectItem value="LAP">LAP - Listing Appointment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assigned Agent</Label>
                <Select
                  value={formData.agent_id || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, agent_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className="text-xs">{getInitials(member.full_name)}</AvatarFallback>
                          </Avatar>
                          {member.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/50">
            <h3 className="text-sm font-semibold text-foreground">Property Details</h3>
            
            <div className="space-y-2">
              <Label>Property Address <span className="text-destructive">*</span></Label>
              <GoogleAddressAutocomplete
                placeholder="Start typing address..."
                defaultValue={formData.address}
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
                currentSuburb={formData.suburb}
                onSuburbChange={(suburb) => setFormData(prev => ({ ...prev, suburb }))}
              />
            </div>

            <OwnersEditor
              owners={formData.owners}
              onChange={(owners) => setFormData(prev => ({ ...prev, owners }))}
              showBeaconSync={false}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimated Value</Label>
                <CurrencyInput
                  value={formData.estimated_value}
                  onChange={(value) => setFormData(prev => ({ ...prev, estimated_value: value }))}
                  placeholder="Enter value"
                />
              </div>

              <div className="space-y-2">
                <Label>Lead Source</Label>
                <Select
                  value={formData.lead_source || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, lead_source: value || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLeadSources.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Prep Template Option */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-background">
            <Checkbox
              id="apply-prep-template"
              checked={applyPrepTemplate}
              onCheckedChange={(checked) => setApplyPrepTemplate(!!checked)}
            />
            <label htmlFor="apply-prep-template" className="text-sm cursor-pointer flex-1">
              <span className="font-medium">Apply preparation tasks</span>
              <span className="text-muted-foreground ml-1">
                — Create tasks to prepare for this appointment
              </span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !formData.address}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            {isSaving ? 'Booking...' : 'Book Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
