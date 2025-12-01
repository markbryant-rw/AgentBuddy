import { useState, useMemo } from 'react';
import { OfficePageHeader } from '@/components/office-manager/OfficePageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { Loader2, Search, TrendingUp, Trophy, Target, Award } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type GroupBy = 'individual' | 'team';
type Period = 'week' | 'month' | 'quarter';

interface PerformanceData {
  id: string;
  name: string;
  avatar_url?: string;
  team_name?: string;
  calls: number;
  appraisals: number;
  open_homes: number;
  cch: number;
}

export default function OfficePerformance() {
  const { activeOffice } = useOfficeSwitcher();
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('individual');
  const [period, setPeriod] = useState<Period>('week');

  const { data: performanceData = [], isLoading } = useQuery({
    queryKey: ['office-performance', activeOffice?.id, period],
    queryFn: async () => {
      if (!activeOffice?.id) return [];

      // Get teams in this office
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('agency_id', activeOffice.id);

      if (!teams) return [];

      const teamIds = teams.map(t => t.id);

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else {
        startDate.setMonth(now.getMonth() - 3);
      }

      // Get team members
      const { data: members } = await supabase
        .from('team_members')
        .select(`
          user_id,
          team_id,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .in('team_id', teamIds);

      if (!members) return [];

      // Get KPI data for all members
      const userIds = members.map(m => m.user_id);
      const { data: kpiData } = await supabase
        .from('kpi_entries')
        .select('user_id, kpi_type, value')
        .in('user_id', userIds)
        .gte('entry_date', startDate.toISOString().split('T')[0])
        .lte('entry_date', now.toISOString().split('T')[0]);

      // Aggregate by user
      const userPerformance = new Map<string, PerformanceData>();

      members.forEach(member => {
        const profile = member.profiles as any;
        const team = teams.find(t => t.id === member.team_id);
        
        userPerformance.set(member.user_id, {
          id: member.user_id,
          name: profile?.full_name || 'Unknown',
          avatar_url: profile?.avatar_url,
          team_name: team?.name || 'Unknown Team',
          calls: 0,
          appraisals: 0,
          open_homes: 0,
          cch: 0,
        });
      });

      // Sum up KPIs
      kpiData?.forEach(entry => {
        const user = userPerformance.get(entry.user_id);
        if (user) {
          if (entry.kpi_type === 'calls') user.calls += entry.value;
          if (entry.kpi_type === 'appraisals') user.appraisals += entry.value;
          if (entry.kpi_type === 'open_homes') user.open_homes += entry.value;
        }
      });

      // Calculate CCH
      userPerformance.forEach(user => {
        user.cch = (user.calls * 0.08) + (user.appraisals * 2) + (user.open_homes * 2);
      });

      return Array.from(userPerformance.values());
    },
    enabled: !!activeOffice?.id,
    staleTime: 2 * 60 * 1000,
  });

  const filteredData = useMemo(() => {
    if (!searchQuery) return performanceData;
    
    const query = searchQuery.toLowerCase();
    return performanceData.filter(p => 
      p.name?.toLowerCase().includes(query) ||
      p.team_name?.toLowerCase().includes(query)
    );
  }, [performanceData, searchQuery]);

  const displayData = useMemo(() => {
    if (groupBy === 'individual') {
      return [...filteredData].sort((a, b) => b.cch - a.cch);
    }

    // Group by team
    const teamMap = new Map<string, PerformanceData>();
    filteredData.forEach(user => {
      const existing = teamMap.get(user.team_name || '');
      if (existing) {
        existing.calls += user.calls;
        existing.appraisals += user.appraisals;
        existing.open_homes += user.open_homes;
        existing.cch += user.cch;
      } else {
        teamMap.set(user.team_name || '', {
          id: user.team_name || '',
          name: user.team_name || 'Unknown Team',
          team_name: user.team_name,
          calls: user.calls,
          appraisals: user.appraisals,
          open_homes: user.open_homes,
          cch: user.cch,
        });
      }
    });

    return Array.from(teamMap.values()).sort((a, b) => b.cch - a.cch);
  }, [filteredData, groupBy]);

  const topPerformer = displayData[0];
  const totalCCH = displayData.reduce((sum, d) => sum + d.cch, 0);
  const avgCCH = displayData.length > 0 ? totalCCH / displayData.length : 0;

  const getRankBadge = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Award className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground">#{index + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <OfficePageHeader
        title="Performance Leaderboard"
        description={`Office-wide KPI performance${activeOffice ? ` for ${activeOffice.name}` : ''}`}
      />

      <div className="container mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total CCH</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{totalCCH.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average CCH</CardTitle>
                <Target className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{avgCCH.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Top Performer</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-yellow-600">{topPerformer?.name || 'N/A'}</div>
              <div className="text-sm text-muted-foreground">{topPerformer?.cch.toFixed(1)} CCH</div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>Leaderboard</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">By Individual</SelectItem>
                    <SelectItem value="team">By Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : displayData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No performance data found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayData.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      index === 0 ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' :
                      index === 1 ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800' :
                      index === 2 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' :
                      'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-center w-12">
                      {getRankBadge(index)}
                    </div>

                    {groupBy === 'individual' && (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={item.avatar_url} />
                        <AvatarFallback>{item.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{item.name}</div>
                      {groupBy === 'individual' && item.team_name && (
                        <div className="text-sm text-muted-foreground truncate">{item.team_name}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Calls</div>
                        <div className="font-semibold">{item.calls}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Appraisals</div>
                        <div className="font-semibold">{item.appraisals}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Open Homes</div>
                        <div className="font-semibold">{item.open_homes}</div>
                      </div>
                      <div className="text-center min-w-[80px]">
                        <Badge 
                          variant="secondary" 
                          className={`${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            ''
                          }`}
                        >
                          {item.cch.toFixed(1)} CCH
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
