import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';

export const AppraisalPipelineWidget = () => {
  const navigate = useNavigate();
  const { activeOffice } = useOfficeSwitcher();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['office-appraisal-stats', activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return null;
      const { data: teams } = await supabase.from('teams').select('id').eq('agency_id', activeOffice.id).eq('is_archived', false);
      if (!teams) return null;
      const teamIds = teams.map(t => t.id);
      const { data: appraisals } = await supabase.from('logged_appraisals').select('intent, status').in('team_id', teamIds);
      const total = appraisals?.length || 0;
      const active = appraisals?.filter(a => a.status === 'active' || a.status === 'map').length || 0;
      const highIntentAppraisals = appraisals?.filter(a => a.intent === 'high').length || 0;
      const converted = appraisals?.filter(a => a.status === 'converted').length || 0;
      const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(0) : '0';
      return { total, active, highIntentAppraisals, conversionRate };
    },
    enabled: !!activeOffice?.id,
  });

  return (
    <Card className="cursor-pointer transition-all hover:shadow-lg border-l-4 border-l-teal-500" onClick={() => navigate('/office-manager/appraisals')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-teal-600" />
            Appraisal Pipeline
          </CardTitle>
          <Badge variant="secondary">{stats?.total || 0}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="h-8 bg-muted animate-pulse rounded" /> : (
          <>
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold">{stats?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total Appraisals</p>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <div><p className="text-xs text-muted-foreground">Active</p><p className="text-lg font-semibold">{stats?.active || 0}</p></div>
                <div><p className="text-xs text-muted-foreground">High Intent</p><p className="text-lg font-semibold text-destructive">{stats?.highIntentAppraisals || 0}</p></div>
                <div><p className="text-xs text-muted-foreground">Conv. Rate</p><p className="text-lg font-semibold text-green-600">{stats?.conversionRate}%</p></div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t flex items-center gap-1 text-sm text-muted-foreground"><TrendingUp className="h-3 w-3" /><span>Click to view reports</span></div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
