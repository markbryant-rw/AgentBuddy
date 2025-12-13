import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  RotateCcw, 
  Phone, 
  Mail, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  ChevronRight,
  Flame,
  Heart,
  Clock,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeaderWithBack } from '@/components/PageHeaderWithBack';
import { usePastSales, PastSale } from '@/hooks/usePastSales';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { cn } from '@/lib/utils';

interface WithdrawnSaleWithProgress extends PastSale {
  daysSinceWithdrawal: number;
  aftercareProgress: number;
  nextTask: any | null;
  isHot: boolean;
}

export default function RescuePipeline() {
  const navigate = useNavigate();
  const { pastSales, isLoading } = usePastSales();
  const { members } = useTeamMembers();
  const [activeTab, setActiveTab] = useState('active');
  const [agentFilter, setAgentFilter] = useState<string | null>(null);

  // Filter for withdrawn sales only
  const withdrawnSales = useMemo(() => {
    return pastSales
      .filter(sale => 
        sale.status?.toLowerCase().includes('withdrawn') ||
        sale.status?.toLowerCase() === 'lost'
      )
      .map(sale => {
        const withdrawnDate = sale.settlement_date ? new Date(sale.settlement_date) : new Date();
        const daysSinceWithdrawal = differenceInDays(new Date(), withdrawnDate);
        
        // Determine if this is a "hot" opportunity (withdrawn recently, has active aftercare)
        const isHot = daysSinceWithdrawal <= 60 && sale.aftercare_status === 'active';
        
        return {
          ...sale,
          daysSinceWithdrawal,
          aftercareProgress: 0,
          nextTask: null,
          isHot,
        } as WithdrawnSaleWithProgress;
      })
      .sort((a, b) => a.daysSinceWithdrawal - b.daysSinceWithdrawal);
  }, [pastSales]);

  // Filter by agent
  const filteredSales = useMemo(() => {
    let filtered = withdrawnSales;
    if (agentFilter) {
      filtered = filtered.filter(s => s.agent_id === agentFilter);
    }
    if (activeTab === 'hot') {
      filtered = filtered.filter(s => s.isHot);
    } else if (activeTab === 'noplan') {
      filtered = filtered.filter(s => s.aftercare_status !== 'active');
    }
    return filtered;
  }, [withdrawnSales, agentFilter, activeTab]);

  // Stats
  const stats = useMemo(() => ({
    total: withdrawnSales.length,
    withAftercare: withdrawnSales.filter(s => s.aftercare_status === 'active').length,
    hot: withdrawnSales.filter(s => s.isHot).length,
    needsAction: withdrawnSales.filter(s => s.aftercare_status !== 'active').length,
  }), [withdrawnSales]);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getVendorName = (sale: WithdrawnSaleWithProgress) => {
    const details = sale.vendor_details as any;
    if (details?.primary?.first_name) {
      return `${details.primary.first_name} ${details.primary.last_name || ''}`.trim();
    }
    return 'Unknown';
  };

  const getAgentMember = (agentId: string | null) => {
    return members.find(m => m.user_id === agentId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-50/20 dark:to-amber-950/10">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <PageHeaderWithBack 
          title="Rescue Pipeline" 
          backPath="/dashboard"
        />

        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-amber-600">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Withdrawn Sales</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200/50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-600">{stats.withAftercare}</div>
              <div className="text-sm text-muted-foreground">With Rescue Plan</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200/50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-rose-600">{stats.hot}</div>
              <div className="text-sm text-muted-foreground">Hot Opportunities</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 border-slate-200/50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-slate-600">{stats.needsAction}</div>
              <div className="text-sm text-muted-foreground">Need Rescue Plan</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="active" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                All ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="hot" className="gap-2">
                <Flame className="h-4 w-4" />
                Hot ({stats.hot})
              </TabsTrigger>
              <TabsTrigger value="noplan" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                No Plan ({stats.needsAction})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Agent filter */}
          <div className="flex gap-2">
            <Button
              variant={agentFilter === null ? "default" : "outline"}
              size="sm"
              onClick={() => setAgentFilter(null)}
            >
              All Agents
            </Button>
            {members.slice(0, 4).map((member) => (
              <Button
                key={member.user_id}
                variant={agentFilter === member.user_id ? "default" : "outline"}
                size="sm"
                className="p-1 h-8 w-8"
                onClick={() => setAgentFilter(member.user_id)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(member.full_name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            ))}
          </div>
        </div>

        {/* Sales List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card className="p-8 text-center text-muted-foreground">
              Loading withdrawn sales...
            </Card>
          ) : filteredSales.length === 0 ? (
            <Card className="p-8 text-center">
              <RotateCcw className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Withdrawn Sales</h3>
              <p className="text-muted-foreground">
                {activeTab === 'hot' 
                  ? "No hot opportunities at the moment" 
                  : activeTab === 'noplan'
                  ? "All withdrawn sales have rescue plans"
                  : "No withdrawn or lost sales found"}
              </p>
            </Card>
          ) : (
            filteredSales.map((sale, index) => {
              const agent = getAgentMember(sale.agent_id);
              
              return (
                <motion.div
                  key={sale.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={cn(
                      "hover:shadow-md transition-all cursor-pointer",
                      sale.isHot && "ring-2 ring-rose-300 bg-rose-50/50 dark:bg-rose-950/10"
                    )}
                    onClick={() => navigate(`/past-sales-history?edit=${sale.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Status indicator */}
                        <div className={cn(
                          "h-12 w-12 rounded-full flex items-center justify-center",
                          sale.isHot 
                            ? "bg-rose-100 dark:bg-rose-900/30" 
                            : sale.aftercare_status === 'active'
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : "bg-slate-100 dark:bg-slate-900/30"
                        )}>
                          {sale.isHot ? (
                            <Flame className="h-6 w-6 text-rose-500" />
                          ) : sale.aftercare_status === 'active' ? (
                            <Heart className="h-6 w-6 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-6 w-6 text-slate-400" />
                          )}
                        </div>

                        {/* Property info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{sale.address}</h3>
                            {sale.isHot && (
                              <Badge className="bg-rose-500 text-white">HOT</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{sale.suburb}</span>
                            <span>•</span>
                            <span>{getVendorName(sale)}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {sale.daysSinceWithdrawal} days since withdrawal
                            </span>
                            {sale.aftercare_status === 'active' && (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <Heart className="h-3 w-3" />
                                Rescue plan active
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Agent */}
                        {agent && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={agent.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(agent.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {!sale.aftercare_status && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/past-sales-history?edit=${sale.id}&tab=aftercare`);
                              }}
                            >
                              <Heart className="h-3 w-3" />
                              Start Plan
                            </Button>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
