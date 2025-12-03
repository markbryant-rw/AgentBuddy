import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ChevronDown, ChevronUp, ArrowRight, Loader2, Building, FileText, DollarSign, Target, Calendar, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

interface OrphanDataSectionProps {
  officeId: string;
  teams: { id: string; name: string }[];
}

interface OrphanCounts {
  pastSales: number;
  loggedAppraisals: number;
  transactions: number;
  quarterlyGoals: number;
  quarterlyReviews: number;
  tasks: number;
}

type DataType = 'pastSales' | 'loggedAppraisals' | 'transactions' | 'quarterlyGoals' | 'quarterlyReviews' | 'tasks';

const dataTypeConfig: Record<DataType, { table: string; label: string; icon: React.ElementType }> = {
  pastSales: { table: 'past_sales', label: 'Past Sales', icon: Building },
  loggedAppraisals: { table: 'logged_appraisals', label: 'Appraisals', icon: FileText },
  transactions: { table: 'transactions', label: 'Transactions', icon: DollarSign },
  quarterlyGoals: { table: 'quarterly_goals', label: 'Goals', icon: Target },
  quarterlyReviews: { table: 'quarterly_reviews', label: 'Reviews', icon: Calendar },
  tasks: { table: 'tasks', label: 'Tasks', icon: ClipboardList },
};

export function OrphanDataSection({ officeId, teams }: OrphanDataSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<DataType>('pastSales');
  const queryClient = useQueryClient();

  // Get orphan team for this office
  const { data: orphanTeam } = useQuery({
    queryKey: ['orphan-team', officeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('agency_id', officeId)
        .eq('is_orphan_team', true)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
      return data;
    },
    enabled: !!officeId,
  });

  // Get counts for each data type
  const { data: orphanCounts } = useQuery({
    queryKey: ['orphan-data-counts', orphanTeam?.id],
    queryFn: async (): Promise<OrphanCounts> => {
      if (!orphanTeam?.id) return { pastSales: 0, loggedAppraisals: 0, transactions: 0, quarterlyGoals: 0, quarterlyReviews: 0, tasks: 0 };

      const [
        { count: pastSales },
        { count: loggedAppraisals },
        { count: transactions },
        { count: quarterlyGoals },
        { count: quarterlyReviews },
        { count: tasks },
      ] = await Promise.all([
        supabase.from('past_sales').select('*', { count: 'exact', head: true }).eq('team_id', orphanTeam.id),
        supabase.from('logged_appraisals').select('*', { count: 'exact', head: true }).eq('team_id', orphanTeam.id),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('team_id', orphanTeam.id),
        supabase.from('quarterly_goals').select('*', { count: 'exact', head: true }).eq('team_id', orphanTeam.id),
        supabase.from('quarterly_reviews').select('*', { count: 'exact', head: true }).eq('team_id', orphanTeam.id),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('team_id', orphanTeam.id),
      ]);

      return {
        pastSales: pastSales || 0,
        loggedAppraisals: loggedAppraisals || 0,
        transactions: transactions || 0,
        quarterlyGoals: quarterlyGoals || 0,
        quarterlyReviews: quarterlyReviews || 0,
        tasks: tasks || 0,
      };
    },
    enabled: !!orphanTeam?.id,
  });

  // Fetch data for active tab
  const { data: orphanData, isLoading: isLoadingData } = useQuery({
    queryKey: ['orphan-data', orphanTeam?.id, activeTab],
    queryFn: async () => {
      if (!orphanTeam?.id) return [];
      const config = dataTypeConfig[activeTab];
      
      const { data, error } = await supabase
        .from(config.table as any)
        .select('*')
        .eq('team_id', orphanTeam.id)
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!orphanTeam?.id && isExpanded,
  });

  // Reassign mutation
  const reassignMutation = useMutation({
    mutationFn: async ({ dataType, recordIds, targetTeamId }: { dataType: DataType; recordIds: string[]; targetTeamId: string }) => {
      const config = dataTypeConfig[dataType];
      const { error } = await supabase
        .from(config.table as any)
        .update({ team_id: targetTeamId })
        .in('id', recordIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orphan-data-counts'] });
      queryClient.invalidateQueries({ queryKey: ['orphan-data'] });
      toast.success('Data reassigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reassign data');
    },
  });

  // Reassign all for current tab
  const handleReassignAll = () => {
    if (!orphanData?.length || !selectedTeamId) return;
    const recordIds = orphanData.map((d: any) => d.id);
    reassignMutation.mutate({ dataType: activeTab, recordIds, targetTeamId: selectedTeamId });
  };

  const totalOrphanCount = orphanCounts
    ? Object.values(orphanCounts).reduce((a, b) => a + b, 0)
    : 0;

  // Don't show if no orphan team or no data
  if (!orphanTeam || totalOrphanCount === 0) return null;

  const activeTeams = teams.filter(t => t.id !== orphanTeam.id);

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="p-4">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  Orphan Data
                  <Badge variant="secondary" className="font-normal">
                    {totalOrphanCount} records
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Historical data from deleted teams
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t space-y-4">
              {/* Quick stats */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {Object.entries(dataTypeConfig).map(([key, config]) => {
                  const count = orphanCounts?.[key as DataType] || 0;
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as DataType)}
                      className={`p-2 rounded-lg text-center transition-colors ${
                        activeTab === key 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <div className="text-lg font-semibold">{count}</div>
                      <div className="text-xs text-muted-foreground">{config.label}</div>
                    </button>
                  );
                })}
              </div>

              {/* Reassign controls */}
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Reassign to:</span>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleReassignAll}
                  disabled={!selectedTeamId || !orphanData?.length || reassignMutation.isPending}
                >
                  {reassignMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Reassign All {dataTypeConfig[activeTab].label}
                    </>
                  )}
                </Button>
              </div>

              {/* Data preview */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/30 px-3 py-2 border-b">
                  <h4 className="text-sm font-medium">
                    {dataTypeConfig[activeTab].label} ({orphanCounts?.[activeTab] || 0})
                  </h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {isLoadingData ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading...
                    </div>
                  ) : orphanData?.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No {dataTypeConfig[activeTab].label.toLowerCase()} in orphan data
                    </div>
                  ) : (
                    <div className="divide-y">
                      {orphanData?.slice(0, 10).map((item: any) => (
                        <div key={item.id} className="p-3 text-sm flex items-center justify-between hover:bg-muted/30">
                          <div>
                            <p className="font-medium">
                              {item.address || item.title || item.name || `Record ${item.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.created_at && new Date(item.created_at).toLocaleDateString()}
                              {item.sale_price && ` • $${Number(item.sale_price).toLocaleString()}`}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(orphanData?.length || 0) > 10 && (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          +{orphanData.length - 10} more records
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
