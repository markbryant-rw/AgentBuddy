import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Target, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface Goal {
  id: string;
  kpi_type: string;
  target_value: number;
  goal_type: string;
  period: string;
  user_id?: string;
  user_name?: string;
}

const kpiTypes = [
  { value: 'calls', label: 'Calls' },
  { value: 'sms', label: 'SMS' },
  { value: 'appraisals', label: 'Appraisals' },
  { value: 'open_homes', label: 'Open Homes' },
  { value: 'listings', label: 'Listings' },
  { value: 'sales', label: 'Sales' },
];

const Goals = () => {
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const [newGoal, setNewGoal] = useState({
    kpi_type: 'calls',
    target_value: 0,
    goal_type: 'individual',
    period: 'weekly',
    user_id: '',
  });

  useEffect(() => {
    fetchGoals();
    if (hasAnyRole(['platform_admin', 'office_manager', 'team_leader'])) {
      fetchTeamMembers();
    }
  }, [user, hasAnyRole]);

  const fetchTeamMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name');
    setTeamMembers(data || []);
  };

  const fetchGoals = async () => {
    if (!user) return;

    const { data: goalsData } = await supabase
      .from('goals')
      .select(`
        *,
        profiles!goals_user_id_fkey(full_name, email)
      `)
      .or(`user_id.eq.${user.id},goal_type.eq.team`);

    const formattedGoals: Goal[] = goalsData?.map((g: any) => ({
      id: g.id,
      kpi_type: g.kpi_type,
      target_value: g.target_value,
      goal_type: g.goal_type,
      period: g.period,
      user_id: g.user_id,
      user_name: g.profiles?.full_name || g.profiles?.email,
    })) || [];

    setGoals(formattedGoals);
    setLoading(false);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const goalData = {
      team_id: user.id,
      user_id: newGoal.goal_type === 'individual' ? newGoal.user_id : null,
      goal_type: newGoal.goal_type as 'individual' | 'team',
      kpi_type: newGoal.kpi_type as 'calls' | 'sms' | 'appraisals' | 'open_homes' | 'listings' | 'sales',
      target_value: newGoal.target_value,
      period: newGoal.period as 'daily' | 'weekly',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      created_by: user.id,
      title: `${newGoal.kpi_type} ${newGoal.goal_type} goal`,
    };

    const { error } = await (supabase as any)
      .from('goals')
      .insert([goalData]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create goal',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Goal created successfully',
    });

    setSheetOpen(false);
    setNewGoal({
      kpi_type: 'calls',
      target_value: 0,
      goal_type: 'individual',
      period: 'weekly',
      user_id: '',
    });
    fetchGoals();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      <div className="bg-gradient-to-br from-blue-50/30 to-white dark:from-blue-900/5 dark:to-background p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Goals & Targets</h1>
              <p className="text-muted-foreground">Set and track your performance goals</p>
            </div>
          </div>
          {hasAnyRole(['platform_admin', 'office_manager', 'team_leader']) && (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Create New Goal</SheetTitle>
                <SheetDescription>Set a new target for your team</SheetDescription>
              </SheetHeader>
              <form onSubmit={handleCreateGoal} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Goal Type</Label>
                  <Select
                    value={newGoal.goal_type}
                    onValueChange={(value) => setNewGoal({ ...newGoal, goal_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newGoal.goal_type === 'individual' && (
                  <div className="space-y-2">
                    <Label>Team Member</Label>
                    <Select
                      value={newGoal.user_id}
                      onValueChange={(value) => setNewGoal({ ...newGoal, user_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name || member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>KPI Type</Label>
                  <Select
                    value={newGoal.kpi_type}
                    onValueChange={(value) => setNewGoal({ ...newGoal, kpi_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {kpiTypes.map((kpi) => (
                        <SelectItem key={kpi.value} value={kpi.value}>
                          {kpi.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select
                    value={newGoal.period}
                    onValueChange={(value) => setNewGoal({ ...newGoal, period: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newGoal.target_value}
                    onChange={(e) => setNewGoal({ ...newGoal, target_value: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full">Create Goal</Button>
              </form>
            </SheetContent>
          </Sheet>
        )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {goals.length === 0 ? (
          <div className="col-span-2 text-center py-16 space-y-4">
            <div className="relative inline-block">
              <Target className="h-20 w-20 mx-auto text-blue-500 animate-bounce" />
              <div className="absolute inset-0 h-20 w-20 mx-auto rounded-full bg-blue-500/20 animate-ping" />
            </div>
            <p className="text-xl font-bold">No goals set yet</p>
            <p className="text-muted-foreground">Set your first performance goal to start tracking progress</p>
            {hasAnyRole(['platform_admin', 'office_manager', 'team_leader']) && (
              <Button onClick={() => setSheetOpen(true)} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Goal
              </Button>
            )}
          </div>
        ) : (
          goals.map((goal) => (
            <Card key={goal.id} className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
              <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle>{kpiTypes.find(k => k.value === goal.kpi_type)?.label}</CardTitle>
                    <CardDescription>
                      {goal.goal_type === 'team' ? 'Team Goal' : `Individual - ${goal.user_name}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{goal.target_value}</div>
                <p className="text-sm text-muted-foreground capitalize mt-2">{goal.period} target</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Goals;
