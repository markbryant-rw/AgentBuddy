import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  FileText, 
  ListTodo, 
  Home, 
  MessageSquare,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SmartRemoveTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string;
    email: string;
    team_id: string;
    team_name: string;
  } | null;
  teamMembers: Array<{ id: string; full_name: string; email: string }>;
  onConfirm: (options: RemovalOptions) => Promise<void>;
}

export interface RemovalOptions {
  userId: string;
  teamId: string;
  taskAction: 'reassign' | 'delete';
  taskAssignee?: string;
  listingAction: 'keep' | 'transfer';
  appraisalAction: 'keep' | 'transfer';
  removeFromConversations: boolean;
}

interface DataImpact {
  tasks: number;
  activeTasks: number;
  listings: number;
  activeListings: number;
  appraisals: number;
  activeAppraisals: number;
  conversations: number;
  notes: number;
}

export const SmartRemoveTeamMemberDialog = ({
  open,
  onOpenChange,
  user,
  teamMembers,
  onConfirm,
}: SmartRemoveTeamMemberDialogProps) => {
  const { user: currentUser } = useAuth();
  const [step, setStep] = useState<'preview' | 'options' | 'confirm'>('preview');
  const [isProcessing, setIsProcessing] = useState(false);
  const isRemovingSelf = currentUser?.id === user?.id;
  
  // Data handling options
  const [taskAction, setTaskAction] = useState<'reassign' | 'delete'>('reassign');
  const [taskAssignee, setTaskAssignee] = useState<string>('');
  const [listingAction, setListingAction] = useState<'keep' | 'transfer'>('keep');
  const [appraisalAction, setAppraisalAction] = useState<'keep' | 'transfer'>('keep');

  // Fetch available team members for reassignment
  const { data: availableMembers } = useQuery({
    queryKey: ['team-members-for-reassignment', user?.team_id],
    queryFn: async () => {
      if (!user?.team_id) return [];
      
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq('team_id', user.team_id)
        .neq('user_id', user.id);

      if (error) throw error;
      return data.map((m: any) => m.profiles).filter(Boolean);
    },
    enabled: open && !!user,
  });

  const availableAssignees = availableMembers || [];

  // Fetch data impact and other team memberships
  const { data: impact, isLoading: isLoadingImpact } = useQuery({
    queryKey: ['team-removal-impact', user?.id, user?.team_id],
    queryFn: async () => {
      if (!user) return null;

      // Fetch other team memberships
      const { data: otherTeams, error: otherTeamsError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          teams:team_id (
            name
          )
        `)
        .eq('user_id', user.id)
        .neq('team_id', user.team_id);

      console.log('[SmartRemoveDialog] Fetching other teams for user:', {
        userId: user.id,
        currentTeamId: user.team_id,
        otherTeams,
        error: otherTeamsError
      });

      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, completed')
        .eq('assigned_to', user.id)
        .eq('team_id', user.team_id);

      // Fetch listings
      const { data: listings } = await supabase
        .from('transactions')
        .select('id, stage')
        .or(`assignees->lead_salesperson.eq.${user.id},assignees->secondary_salesperson.eq.${user.id}`)
        .eq('team_id', user.team_id);

      // Fetch appraisals
      const { data: appraisals } = await supabase
        .from('logged_appraisals')
        .select('id, outcome')
        .eq('created_by', user.id)
        .eq('team_id', user.team_id);

      // Fetch conversation participations
      const { data: conversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id, conversations!inner(type, channel_type)')
        .eq('user_id', user.id);

      const teamConversations = conversations?.filter(
        (c: any) => c.conversations.type === 'group' && c.conversations.channel_type === 'team'
      ) || [];

      // Fetch notes (simplified query to avoid type issues)
      const { count: notesCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('team_id', user.team_id);

      return {
        tasks: tasks?.length || 0,
        activeTasks: tasks?.filter((t) => !t.completed).length || 0,
        listings: listings?.length || 0,
        activeListings: listings?.filter((l) => l.stage !== 'settled' && l.stage !== 'withdrawn').length || 0,
        appraisals: appraisals?.length || 0,
        activeAppraisals: appraisals?.filter((a) => a.outcome === 'In Progress').length || 0,
        conversations: teamConversations.length,
        notes: notesCount || 0,
        otherTeams: otherTeams || [],
        willBecomeSoloAgent: !otherTeams || otherTeams.length === 0,
      } as DataImpact & { otherTeams: any[], willBecomeSoloAgent: boolean };
    },
    enabled: open && !!user,
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('preview');
      setTaskAction('reassign');
      setTaskAssignee('');
      setListingAction('keep');
      setAppraisalAction('keep');
      setIsProcessing(false);
    }
  }, [open]);

  const handleNext = () => {
    if (step === 'preview') {
      setStep('options');
    } else if (step === 'options') {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'options') {
      setStep('preview');
    } else if (step === 'confirm') {
      setStep('options');
    }
  };

  const handleConfirm = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      await onConfirm({
        userId: user.id,
        teamId: user.team_id,
        taskAction,
        taskAssignee: taskAction === 'reassign' ? taskAssignee : undefined,
        listingAction,
        appraisalAction,
        removeFromConversations: true,
        isRemovingSelf,
      } as any);
      
      // Don't close dialog immediately if removing self - let the redirect happen
      if (!isRemovingSelf) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Removal failed:', error);
      setIsProcessing(false);
    }
  };

  const canProceedFromOptions = () => {
    if (taskAction === 'reassign' && !taskAssignee && impact && impact.activeTasks > 0) {
      return false;
    }
    return true;
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'preview' && 'Remove Team Member'}
            {step === 'options' && 'Configure Data Handling'}
            {step === 'confirm' && 'Confirm Removal'}
          </DialogTitle>
          <DialogDescription>
            {step === 'preview' && (
              <>
                Removing {user.full_name} from {user.team_name}
                {isRemovingSelf && (
                  <span className="block mt-2 text-orange-600 dark:text-orange-400 font-medium">
                    ⚠️ You are removing yourself from this team
                  </span>
                )}
              </>
            )}
            {step === 'options' && 'Choose how to handle their data'}
            {step === 'confirm' && 'Review your choices before proceeding'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Preview Impact */}
        {step === 'preview' && (
          <div className="space-y-4">
            {isLoadingImpact ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {impact?.willBecomeSoloAgent ? (
                      <>
                        {user.full_name} will become a <strong>Solo Agent</strong> and will no longer be part of {user.team_name}.
                        Their profile and personal data will remain intact.
                      </>
                    ) : (
                      <>
                        {user.full_name} will be removed from <strong>{user.team_name}</strong> but will remain in{' '}
                        <strong>{impact?.otherTeams?.length || 0} other team{impact?.otherTeams?.length === 1 ? '' : 's'}</strong>.
                        {impact?.otherTeams && impact.otherTeams.length > 0 && (
                          <span className="block mt-1 text-xs">
                            Teams: {impact.otherTeams.map((t: any) => t.teams?.name).filter(Boolean).join(', ')}
                          </span>
                        )}
                      </>
                    )}
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Data Impact Analysis</h4>
                  
                  <DataImpactItem
                    icon={<ListTodo className="h-4 w-4" />}
                    label="Tasks"
                    total={impact?.tasks || 0}
                    active={impact?.activeTasks || 0}
                    severity={impact && impact.activeTasks > 0 ? 'warning' : 'info'}
                  />

                  <DataImpactItem
                    icon={<Home className="h-4 w-4" />}
                    label="Listings"
                    total={impact?.listings || 0}
                    active={impact?.activeListings || 0}
                    severity={impact && impact.activeListings > 0 ? 'warning' : 'info'}
                  />

                  <DataImpactItem
                    icon={<TrendingUp className="h-4 w-4" />}
                    label="Appraisals"
                    total={impact?.appraisals || 0}
                    active={impact?.activeAppraisals || 0}
                    severity="info"
                  />

                  <DataImpactItem
                    icon={<MessageSquare className="h-4 w-4" />}
                    label="Team Conversations"
                    total={impact?.conversations || 0}
                    severity="info"
                  />

                  <DataImpactItem
                    icon={<FileText className="h-4 w-4" />}
                    label="Notes"
                    total={impact?.notes || 0}
                    severity="info"
                  />
                </div>

                {impact && (impact.activeTasks > 0 || impact.activeListings > 0) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This user has active work items. You'll need to decide how to handle them in the next step.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 2: Configure Options */}
        {step === 'options' && impact && (
          <div className="space-y-6">
            {/* Tasks Handling */}
            {impact.tasks > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Tasks ({impact.tasks})</Label>
                  {impact.activeTasks > 0 && (
                    <Badge variant="outline">{impact.activeTasks} active</Badge>
                  )}
                </div>
                
                <RadioGroup value={taskAction} onValueChange={(v: any) => setTaskAction(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="reassign" id="task-reassign" />
                    <Label htmlFor="task-reassign" className="font-normal cursor-pointer">
                      Reassign to another team member
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="delete" id="task-delete" />
                    <Label htmlFor="task-delete" className="font-normal cursor-pointer">
                      Delete all tasks
                    </Label>
                  </div>
                </RadioGroup>

                {taskAction === 'reassign' && (
                  <div className="ml-6">
                    <Label htmlFor="task-assignee" className="text-sm">Assign to:</Label>
                    <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                      <SelectTrigger id="task-assignee" className="mt-1">
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAssignees.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name} ({member.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {impact.tasks > 0 && impact.listings > 0 && <Separator />}

            {/* Listings Handling */}
            {impact.listings > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Listings ({impact.listings})</Label>
                  {impact.activeListings > 0 && (
                    <Badge variant="outline">{impact.activeListings} active</Badge>
                  )}
                </div>
                
                <RadioGroup value={listingAction} onValueChange={(v: any) => setListingAction(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="keep" id="listing-keep" />
                    <Label htmlFor="listing-keep" className="font-normal cursor-pointer">
                      Keep with user (they own the client relationship)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="transfer" id="listing-transfer" />
                    <Label htmlFor="listing-transfer" className="font-normal cursor-pointer">
                      Transfer to team (will need manual reassignment)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {impact.listings > 0 && impact.appraisals > 0 && <Separator />}

            {/* Appraisals Handling */}
            {impact.appraisals > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Appraisals ({impact.appraisals})</Label>
                  {impact.activeAppraisals > 0 && (
                    <Badge variant="outline">{impact.activeAppraisals} active</Badge>
                  )}
                </div>
                
                <RadioGroup value={appraisalAction} onValueChange={(v: any) => setAppraisalAction(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="keep" id="appraisal-keep" />
                    <Label htmlFor="appraisal-keep" className="font-normal cursor-pointer">
                      Keep with user
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="transfer" id="appraisal-transfer" />
                    <Label htmlFor="appraisal-transfer" className="font-normal cursor-pointer">
                      Mark as team-generated leads
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Info about other data */}
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Automatic handling:</strong> User will be removed from team conversations. 
                Personal data (KPIs, goals, activities) will remain with the user. Notes will be preserved.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && impact && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please review your choices carefully. This action cannot be undone automatically.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 text-sm">
              <h4 className="font-semibold">Summary of Actions:</h4>
              
              <div className="space-y-2 pl-4">
                <div>
                  • <strong>{user.full_name}</strong> will {impact?.willBecomeSoloAgent 
                    ? 'become a Solo Agent' 
                    : `remain in ${impact?.otherTeams?.length || 0} other team${impact?.otherTeams?.length === 1 ? '' : 's'}`
                  }
                </div>
                
                {impact.tasks > 0 && (
                  <div>
                    • <strong>Tasks:</strong> {taskAction === 'reassign' 
                      ? `Reassign ${impact.tasks} task(s) to ${availableAssignees.find((m) => m.id === taskAssignee)?.full_name}`
                      : `Delete ${impact.tasks} task(s)`
                    }
                  </div>
                )}
                
                {impact.listings > 0 && (
                  <div>
                    • <strong>Listings:</strong> {listingAction === 'keep'
                      ? `Keep ${impact.listings} listing(s) with user`
                      : `Transfer ${impact.listings} listing(s) to team pool`
                    }
                  </div>
                )}
                
                {impact.appraisals > 0 && (
                  <div>
                    • <strong>Appraisals:</strong> {appraisalAction === 'keep'
                      ? `Keep ${impact.appraisals} appraisal(s) with user`
                      : `Mark ${impact.appraisals} appraisal(s) as team leads`
                    }
                  </div>
                )}
                
                {impact.conversations > 0 && (
                  <div>• Remove from {impact.conversations} team conversation(s)</div>
                )}
                
                <div>• Personal data (KPIs, goals, notes) remain with user</div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step !== 'preview' && (
            <Button variant="outline" onClick={handleBack} disabled={isProcessing}>
              Back
            </Button>
          )}
          
          {step !== 'confirm' ? (
            <Button 
              onClick={handleNext} 
              disabled={isLoadingImpact || (step === 'options' && !canProceedFromOptions())}
            >
              Next
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              onClick={handleConfirm} 
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Removal'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface DataImpactItemProps {
  icon: React.ReactNode;
  label: string;
  total: number;
  active?: number;
  severity?: 'info' | 'warning' | 'critical';
}

const DataImpactItem = ({ icon, label, total, active, severity = 'info' }: DataImpactItemProps) => {
  const getSeverityColor = () => {
    switch (severity) {
      case 'critical': return 'text-destructive';
      case 'warning': return 'text-orange-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        <div className={getSeverityColor()}>{icon}</div>
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-sm text-muted-foreground">
            {total} total {active !== undefined && active > 0 && `(${active} active)`}
          </div>
        </div>
      </div>
      {total > 0 && (
        <Badge variant={severity === 'warning' ? 'outline' : 'secondary'}>
          {total}
        </Badge>
      )}
    </div>
  );
};
