import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePastSales } from '@/hooks/usePastSales';
import { useTeam } from '@/hooks/useTeam';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { 
  Heart, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Phone,
  Mail,
  Gift,
  Users,
  TrendingUp,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyFull } from '@/lib/currencyUtils';

type HealthStatus = 'healthy' | 'attention' | 'at-risk';

interface PastSaleWithHealth {
  id: string;
  address: string;
  vendorName: string;
  settlementDate: string;
  salePrice: number;
  healthScore: number;
  healthStatus: HealthStatus;
  overdueTaskCount: number;
  nextTouchpoint?: {
    title: string;
    dueDate: string;
    type: string;
  };
}

const RelationshipDashboard = () => {
  const { team } = useTeam();
  const { pastSales, isLoading: salesLoading } = usePastSales(team?.id);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Fetch aftercare tasks for health scoring
  const { data: aftercareTasks = [] } = useQuery({
    queryKey: ['aftercare-tasks-all', team?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .not('past_sale_id', 'is', null)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!team?.id,
  });

  // Calculate health scores for each past sale
  const salesWithHealth = useMemo((): PastSaleWithHealth[] => {
    return pastSales
      .filter(sale => sale.status !== 'withdrawn')
      .map(sale => {
        const saleTasks = aftercareTasks.filter(t => t.past_sale_id === sale.id);
        const totalTasks = saleTasks.length;
        const completedTasks = saleTasks.filter(t => t.completed).length;
        const overdueTasks = saleTasks.filter(t => 
          !t.completed && new Date(t.due_date) < new Date()
        );

        // Calculate health score (0-100)
        let healthScore = 100;
        if (totalTasks > 0) {
          const completionRate = completedTasks / totalTasks;
          const overdueRate = overdueTasks.length / totalTasks;
          healthScore = Math.round((completionRate * 70) + ((1 - overdueRate) * 30));
        }

        // Determine status
        let healthStatus: HealthStatus = 'healthy';
        if (healthScore < 50 || overdueTasks.length >= 3) {
          healthStatus = 'at-risk';
        } else if (healthScore < 75 || overdueTasks.length >= 1) {
          healthStatus = 'attention';
        }

        // Find next touchpoint
        const nextTask = saleTasks
          .filter(t => !t.completed && new Date(t.due_date) >= new Date())
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

        const vendorName = `${sale.vendor_details?.primary?.first_name || ''} ${sale.vendor_details?.primary?.last_name || ''}`.trim() || 'Unknown';

        return {
          id: sale.id,
          address: sale.address,
          vendorName,
          settlementDate: sale.settlement_date || '',
          salePrice: sale.sale_price || 0,
          healthScore,
          healthStatus,
          overdueTaskCount: overdueTasks.length,
          nextTouchpoint: nextTask ? {
            title: nextTask.title,
            dueDate: nextTask.due_date,
            type: nextTask.title.toLowerCase().includes('call') ? 'phone' : 
                  nextTask.title.toLowerCase().includes('email') ? 'email' : 'general',
          } : undefined,
        };
      })
      .sort((a, b) => a.healthScore - b.healthScore);
  }, [pastSales, aftercareTasks]);

  // Calendar data
  const calendarDays = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return eachDayOfInterval({ start, end });
  }, [selectedMonth]);

  const touchpointsByDate = useMemo(() => {
    const map = new Map<string, typeof aftercareTasks>();
    aftercareTasks
      .filter(t => !t.completed)
      .forEach(task => {
        const dateKey = format(new Date(task.due_date), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        existing.push(task);
        map.set(dateKey, existing);
      });
    return map;
  }, [aftercareTasks]);

  // Stats
  const stats = useMemo(() => {
    const healthy = salesWithHealth.filter(s => s.healthStatus === 'healthy').length;
    const attention = salesWithHealth.filter(s => s.healthStatus === 'attention').length;
    const atRisk = salesWithHealth.filter(s => s.healthStatus === 'at-risk').length;
    const totalOverdue = salesWithHealth.reduce((sum, s) => sum + s.overdueTaskCount, 0);
    const avgHealth = salesWithHealth.length > 0 
      ? Math.round(salesWithHealth.reduce((sum, s) => sum + s.healthScore, 0) / salesWithHealth.length)
      : 0;

    return { healthy, attention, atRisk, totalOverdue, avgHealth, total: salesWithHealth.length };
  }, [salesWithHealth]);

  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'attention': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'at-risk': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case 'healthy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'attention': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'at-risk': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="operate" currentPage="Relationship Dashboard" />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Heart className="h-8 w-8 text-pink-500" />
              Relationship Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor relationship health and upcoming touchpoints
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.healthy}</p>
                <p className="text-xs text-muted-foreground">Healthy</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.attention}</p>
                <p className="text-xs text-muted-foreground">Needs Attention</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 border-red-200 dark:border-red-800">
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.atRisk}</p>
                <p className="text-xs text-muted-foreground">At Risk</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.avgHealth}%</p>
                <p className="text-xs text-muted-foreground">Avg Health</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Relationships</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Health Overview */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="all" className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Relationship Health</h2>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="at-risk">At Risk</TabsTrigger>
                    <TabsTrigger value="attention">Attention</TabsTrigger>
                    <TabsTrigger value="healthy">Healthy</TabsTrigger>
                  </TabsList>
                </div>

                {['all', 'at-risk', 'attention', 'healthy'].map(filter => (
                  <TabsContent key={filter} value={filter}>
                    <Card>
                      <ScrollArea className="h-[400px]">
                        <div className="p-4 space-y-3">
                          {salesWithHealth
                            .filter(s => filter === 'all' || s.healthStatus === filter)
                            .map(sale => (
                              <div
                                key={sale.id}
                                className={cn(
                                  "p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer",
                                  sale.healthStatus === 'at-risk' && "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20",
                                  sale.healthStatus === 'attention' && "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20",
                                  sale.healthStatus === 'healthy' && "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                                )}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {getStatusIcon(sale.healthStatus)}
                                      <p className="font-medium truncate">{sale.vendorName}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">{sale.address}</p>
                                    {sale.nextTouchpoint && (
                                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                        {sale.nextTouchpoint.type === 'phone' && <Phone className="h-3 w-3" />}
                                        {sale.nextTouchpoint.type === 'email' && <Mail className="h-3 w-3" />}
                                        {sale.nextTouchpoint.type === 'general' && <Gift className="h-3 w-3" />}
                                        <span>Next: {sale.nextTouchpoint.title}</span>
                                        <span className="text-muted-foreground">
                                          ({format(new Date(sale.nextTouchpoint.dueDate), 'MMM d')})
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="flex items-center gap-2">
                                      <Badge className={getStatusColor(sale.healthStatus)}>
                                        {sale.healthScore}%
                                      </Badge>
                                    </div>
                                    {sale.overdueTaskCount > 0 && (
                                      <p className="text-xs text-red-500 mt-1">
                                        {sale.overdueTaskCount} overdue
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          {salesWithHealth.filter(s => filter === 'all' || s.healthStatus === filter).length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                              <p>No relationships in this category</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Touchpoints Calendar */}
            <div>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Upcoming Touchpoints
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium w-24 text-center">
                        {format(selectedMonth, 'MMM yyyy')}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before month start */}
                    {Array.from({ length: calendarDays[0]?.getDay() || 0 }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-8" />
                    ))}
                    {calendarDays.map((day) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayTasks = touchpointsByDate.get(dateKey) || [];
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div
                          key={dateKey}
                          className={cn(
                            "h-8 rounded-md flex items-center justify-center text-sm relative cursor-pointer hover:bg-muted transition-colors",
                            isToday && "bg-primary text-primary-foreground font-bold",
                            dayTasks.length > 0 && !isToday && "bg-primary/10"
                          )}
                        >
                          {format(day, 'd')}
                          {dayTasks.length > 0 && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary text-[8px] text-primary-foreground flex items-center justify-center">
                              {dayTasks.length}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Upcoming Tasks List */}
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Next 7 Days</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {aftercareTasks
                        .filter(t => {
                          const dueDate = new Date(t.due_date);
                          const today = new Date();
                          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                          return !t.completed && dueDate >= today && dueDate <= weekFromNow;
                        })
                        .slice(0, 5)
                        .map(task => {
                          const sale = pastSales.find(s => s.id === task.past_sale_id);
                          return (
                            <div key={task.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                              <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="truncate">{task.title}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {sale?.address || 'Unknown'}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {format(new Date(task.due_date), 'MMM d')}
                              </span>
                            </div>
                          );
                        })}
                      {aftercareTasks.filter(t => {
                        const dueDate = new Date(t.due_date);
                        const today = new Date();
                        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                        return !t.completed && dueDate >= today && dueDate <= weekFromNow;
                      }).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No touchpoints this week
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelationshipDashboard;
