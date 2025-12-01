import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, ArrowRight, Phone, FileText, Home, Building } from 'lucide-react';
import { ProgressRing } from '@/components/ProgressRing';
import { useNavigate } from 'react-router-dom';
interface PerformanceSnapshotProps {
  weeklyCCH: number;
  weeklyCCHTarget: number;
  weeklyProgress: {
    calls: number;
    appraisals: number;
    openHomes: number;
    listings: number;
  };
  isCollapsed?: boolean;
}
export const PerformanceSnapshot = ({
  weeklyCCH,
  weeklyCCHTarget,
  weeklyProgress,
  isCollapsed
}: PerformanceSnapshotProps) => {
  const navigate = useNavigate();
  const cchProgress = weeklyCCHTarget > 0 ? weeklyCCH / weeklyCCHTarget * 100 : 0;
  return <Card className="border-l-4 border-l-indigo-500 hover:shadow-xl transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Performance Snapshot
          </CardTitle>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={() => navigate('/kpi-tracker')} className="gap-1.5 bg-background hover:bg-accent hover:scale-105 transition-all shadow-sm">
              View Full
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && <CardContent className="space-y-6 pt-6">
          {/* Weekly CCH with larger ring */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Weekly Customer Contact Hours</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {weeklyCCH.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Target: {weeklyCCHTarget.toFixed(1)} hrs
              </p>
            </div>
            <ProgressRing progress={cchProgress} size={100} strokeWidth={10} hidePercentage={false} hideBackgroundRing={false} className="drop-shadow-lg" />
          </div>

          {/* Weekly Metrics Grid with hover effects */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <div className="group p-3 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 border border-red-100 dark:border-red-900/30 hover:shadow-md transition-all cursor-pointer">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Calls
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{weeklyProgress.calls}</p>
            </div>
            <div className="group p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-100 dark:border-green-900/30 hover:shadow-md transition-all cursor-pointer">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Appraisals
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{weeklyProgress.appraisals}</p>
            </div>
            <div className="group p-3 rounded-lg bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10 border border-yellow-100 dark:border-yellow-900/30 hover:shadow-md transition-all cursor-pointer">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Home className="h-3 w-3" />
                Open Homes
              </p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{weeklyProgress.openHomes}</p>
            </div>
            <div className="group p-3 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 border border-blue-100 dark:border-blue-900/30 hover:shadow-md transition-all cursor-pointer">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Building className="h-3 w-3" />
                Listings
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{weeklyProgress.listings}</p>
            </div>
          </div>
        </CardContent>}
    </Card>;
};