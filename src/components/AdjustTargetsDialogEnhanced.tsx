import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamMemberTargetsTable } from '@/components/TeamMemberTargetsTable';
import { TeamGoalsReadOnlyView } from '@/components/TeamGoalsReadOnlyView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { TeamGoal, MemberGoal, TeamMember } from '@/hooks/useTeamGoals';

const formSchema = z.object({
  calls: z.coerce.number().min(0, 'Must be 0 or greater'),
  sms: z.coerce.number().min(0, 'Must be 0 or greater'),
  appraisals: z.coerce.number().min(0, 'Must be 0 or greater'),
  openHomes: z.coerce.number().min(0, 'Must be 0 or greater'),
  listings: z.coerce.number().min(0, 'Must be 0 or greater'),
  sales: z.coerce.number().min(0, 'Must be 0 or greater'),
});

type FormValues = z.infer<typeof formSchema>;

interface AdjustTargetsDialogEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  currentUserGoals: FormValues;
  teamGoals?: TeamGoal[];
  memberGoals?: MemberGoal[];
  teamMembers?: TeamMember[];
  onSavePersonalGoals: (goals: FormValues) => Promise<void>;
  onSaveTeamGoals?: (goals: FormValues) => Promise<void>;
  onUpdateMemberGoal?: (userId: string, kpiType: string, value: number, notes?: string) => Promise<void>;
  onToggleContribution?: (teamMemberId: string, contributes: boolean) => Promise<void>;
}

export const AdjustTargetsDialogEnhanced = ({
  open,
  onOpenChange,
  isAdmin,
  currentUserGoals,
  teamGoals = [],
  memberGoals = [],
  teamMembers = [],
  onSavePersonalGoals,
  onSaveTeamGoals,
  onUpdateMemberGoal,
  onToggleContribution,
}: AdjustTargetsDialogEnhancedProps) => {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingTeamGoals, setEditingTeamGoals] = useState(false);

  const personalForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: currentUserGoals,
  });

  const teamForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      calls: teamGoals.find(g => g.kpi_type === 'calls')?.target_value || 0,
      sms: teamGoals.find(g => g.kpi_type === 'sms')?.target_value || 0,
      appraisals: teamGoals.find(g => g.kpi_type === 'appraisals')?.target_value || 0,
      openHomes: teamGoals.find(g => g.kpi_type === 'open_homes')?.target_value || 0,
      listings: teamGoals.find(g => g.kpi_type === 'listings')?.target_value || 0,
      sales: teamGoals.find(g => g.kpi_type === 'sales')?.target_value || 0,
    },
  });

  // Reset forms when dialog opens with fresh data from database
  useEffect(() => {
    if (open) {
      personalForm.reset(currentUserGoals);
      
      teamForm.reset({
        calls: teamGoals.find(g => g.kpi_type === 'calls')?.target_value || 0,
        sms: teamGoals.find(g => g.kpi_type === 'sms')?.target_value || 0,
        appraisals: teamGoals.find(g => g.kpi_type === 'appraisals')?.target_value || 0,
        openHomes: teamGoals.find(g => g.kpi_type === 'open_homes')?.target_value || 0,
        listings: teamGoals.find(g => g.kpi_type === 'listings')?.target_value || 0,
        sales: teamGoals.find(g => g.kpi_type === 'sales')?.target_value || 0,
      });
    }
  }, [open, currentUserGoals, teamGoals, personalForm, teamForm]);

  const onSubmitPersonal = async (values: FormValues) => {
    setSaving(true);
    try {
      await onSavePersonalGoals(values);
      toast({
        title: 'Targets updated',
        description: 'Your personal targets have been saved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update targets. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const onSubmitTeam = async (values: FormValues) => {
    if (!onSaveTeamGoals) return;
    setSaving(true);
    try {
      await onSaveTeamGoals(values);
      toast({
        title: 'Team targets updated',
        description: 'Team-level targets have been saved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update team targets. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateVariance = (kpiType: string) => {
    const teamGoal = teamGoals.find(g => g.kpi_type === kpiType)?.target_value || 0;
    const memberSum = memberGoals
      .filter(g => g.kpi_type === kpiType)
      .filter(g => {
        const member = teamMembers.find(m => m.user_id === g.user_id);
        return member?.contributes_to_kpis !== false;
      })
      .reduce((sum, g) => sum + (g.target_value || 0), 0);
    return teamGoal - memberSum;
  };

  const adminNotes = memberGoals.find(g => g.set_by_admin)?.admin_notes;
  const isOnTeam = teamMembers.length > 0;

  if (!isAdmin) {
    // Non-admin with team - show targets + read-only team view
    if (isOnTeam) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Your Weekly Targets & Team Goals</DialogTitle>
            <DialogDescription>
              Manage your personal weekly targets and view your team's weekly goals.
            </DialogDescription>
          </DialogHeader>

            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="personal">Your Weekly Targets</TabsTrigger>
                <TabsTrigger value="team">Team Weekly Goals</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <Form {...personalForm}>
                  <form onSubmit={personalForm.handleSubmit(onSubmitPersonal)} className="space-y-4">
                    {adminNotes && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Admin Note:</strong> {adminNotes}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={personalForm.control} name="calls" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Calls (per week)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={personalForm.control} name="sms" render={({ field }) => (
                        <FormItem>
                          <FormLabel>SMS (per week)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={personalForm.control} name="appraisals" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Appraisals (per week)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={personalForm.control} name="openHomes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Open Homes (per week)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={personalForm.control} name="listings" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Listings (per week)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={personalForm.control} name="sales" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sales (per week)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Targets'}</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="team" className="space-y-4">
                <TeamGoalsReadOnlyView
                  teamGoals={teamGoals}
                  memberGoals={memberGoals}
                  teamMembers={teamMembers}
                  currentUserId={user?.id || ''}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      );
    }

    // Non-admin without team - simple form only
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adjust Your Weekly Targets</DialogTitle>
            <DialogDescription>
              Set your personal weekly pipeline targets.
            </DialogDescription>
          </DialogHeader>
          <Form {...personalForm}>
            <form onSubmit={personalForm.handleSubmit(onSubmitPersonal)} className="space-y-4">
              {adminNotes && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Admin Note:</strong> {adminNotes}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={personalForm.control} name="calls" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calls (per week)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={personalForm.control} name="sms" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMS (per week)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={personalForm.control} name="appraisals" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appraisals (per week)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={personalForm.control} name="openHomes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Open Homes (per week)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={personalForm.control} name="listings" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listings (per week)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={personalForm.control} name="sales" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales (per week)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Targets'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  // Admin view - 2 tabs with personal and team goals (combined member management + team summary)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Weekly Targets</DialogTitle>
          <DialogDescription>
            Set your personal weekly targets{isOnTeam ? ' and manage team member weekly targets' : ''}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">Your Weekly Targets</TabsTrigger>
            <TabsTrigger value="team">Team Weekly Goals</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <Form {...personalForm}>
              <form onSubmit={personalForm.handleSubmit(onSubmitPersonal)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={personalForm.control} name="calls" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calls (per week)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={personalForm.control} name="sms" render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMS (per week)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={personalForm.control} name="appraisals" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appraisals (per week)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={personalForm.control} name="openHomes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Open Homes (per week)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={personalForm.control} name="listings" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Listings (per week)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={personalForm.control} name="sales" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales (per week)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save My Targets'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            {!isOnTeam ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You haven't created a team yet. Create or join a team from the Setup page to enable team goal management.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Team Summary Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Weekly Team Summary</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTeamGoals(!editingTeamGoals)}
                    >
                      {editingTeamGoals ? 'Cancel' : 'Edit Team Goals'}
                    </Button>
                  </div>

                  {editingTeamGoals ? (
                    <Form {...teamForm}>
                      <form onSubmit={teamForm.handleSubmit(onSubmitTeam)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {(['calls', 'sms', 'appraisals', 'openHomes', 'listings', 'sales'] as const).map((kpi) => {
                            const variance = calculateVariance(kpi === 'openHomes' ? 'open_homes' : kpi);
                            const label = {
                              calls: 'Calls (per week)',
                              sms: 'SMS (per week)',
                              appraisals: 'Appraisals (per week)',
                              openHomes: 'Open Homes (per week)',
                              listings: 'Listings (per week)',
                              sales: 'Sales (per week)',
                            }[kpi];
                            return (
                              <div key={kpi} className="space-y-2">
                                <FormField control={teamForm.control} name={kpi} render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{label}</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                {Math.abs(variance) > 0 && (
                                  <p className={cn("text-xs", variance > 0 ? "text-orange-500" : "text-blue-500")}>
                                    {variance > 0 ? `+${variance} short` : `${Math.abs(variance)} over`}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingTeamGoals(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Team Goals'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {(['calls', 'sms', 'appraisals', 'openHomes', 'listings', 'sales'] as const).map((kpi) => {
                        const kpiType = kpi === 'openHomes' ? 'open_homes' : kpi;
                        const teamGoal = teamGoals.find(g => g.kpi_type === kpiType)?.target_value || 0;
                        const memberSum = memberGoals
                          .filter(g => g.kpi_type === kpiType)
                          .filter(g => {
                            const member = teamMembers.find(m => m.user_id === g.user_id);
                            return member?.contributes_to_kpis !== false;
                          })
                          .reduce((sum, g) => sum + (g.target_value || 0), 0);
                        const variance = teamGoal - memberSum;
                        const isOnTrack = variance <= 0;

                        return (
                          <div key={kpi} className="p-3 border rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {kpi.charAt(0).toUpperCase() + kpi.slice(1).replace(/([A-Z])/g, ' $1')}
                              </span>
                              {isOnTrack ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Team Goal:</span>
                                <span className="font-semibold">{teamGoal}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Member Sum:</span>
                                <span className={cn('font-semibold', isOnTrack ? 'text-green-500' : 'text-orange-500')}>
                                  {memberSum}
                                </span>
                              </div>
                              {!isOnTrack && (
                                <div className="flex justify-between text-orange-500">
                                  <span>Variance:</span>
                                  <span className="font-semibold">+{variance} short</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Team Member Targets Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Team Member Targets</h3>
                  <TeamMemberTargetsTable
                    members={teamMembers}
                    memberGoals={memberGoals}
                    onUpdateMemberGoal={onUpdateMemberGoal!}
                    onToggleContribution={onToggleContribution!}
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
