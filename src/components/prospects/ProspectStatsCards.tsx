import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';

interface ProspectStatsCardsProps {
  appraisalStats: {
    total: number;
    active: number;
    converted: number;
    conversionRate: string;
  };
  pipelineStats: {
    total: number;
    hot: number;
    warm: number;
    cold: number;
  };
  appraisals: LoggedAppraisal[];
}

const ProspectStatsCards = ({ appraisalStats, pipelineStats, appraisals }: ProspectStatsCardsProps) => {
  const followUpsDue = appraisals.filter(a => {
    if (!a.next_follow_up || a.outcome !== 'In Progress') return false;
    const followUpDate = new Date(a.next_follow_up);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return followUpDate <= sevenDaysFromNow && followUpDate >= new Date();
  }).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Appraisals</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{appraisalStats.total}</div>
          <p className="text-xs text-muted-foreground">
            {appraisalStats.active} active
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Opportunities</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pipelineStats.total}</div>
          <p className="text-xs text-muted-foreground">
            {pipelineStats.hot} hot, {pipelineStats.warm} warm
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{appraisalStats.conversionRate}%</div>
          <p className="text-xs text-muted-foreground">
            {appraisalStats.converted} converted
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Follow-ups Due</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{followUpsDue}</div>
          <p className="text-xs text-muted-foreground">Next 7 days</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProspectStatsCards;
