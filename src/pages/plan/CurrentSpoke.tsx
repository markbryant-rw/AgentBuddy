import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Target, Plus, TrendingUp, Calendar } from 'lucide-react';
import { getQuarter, format, startOfQuarter, endOfQuarter, differenceInWeeks } from 'date-fns';

export default function CurrentSpoke() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentQuarter = getQuarter(new Date());
  const year = new Date().getFullYear();
  const quarterStart = startOfQuarter(new Date());
  const quarterEnd = endOfQuarter(new Date());
  const weeksIntoQuarter = differenceInWeeks(new Date(), quarterStart) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/plan-dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">This Quarter</h1>
                <p className="text-sm text-muted-foreground">
                  Q{currentQuarter} {year} • Week {weeksIntoQuarter} of 13 • {format(quarterStart, 'MMM d')} - {format(quarterEnd, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Log Today's Activity
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Current Progress Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Current Progress</CardTitle>
                <CardDescription>Real-time tracking of your quarterly goals</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Appraisals</h3>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">--</span>
                    <span className="text-muted-foreground">/ -- target</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-0" />
                  </div>
                  <p className="text-sm text-muted-foreground">Progress tracking to be implemented</p>
                </div>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">CCH (This Week)</h3>
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">--</span>
                    <span className="text-muted-foreground">/ -- hrs</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-0" />
                  </div>
                  <p className="text-sm text-muted-foreground">Weekly progress tracking</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week-by-Week Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Breakdown
            </CardTitle>
            <CardDescription>Track your progress week by week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-muted-foreground italic">Week-by-week activity breakdown and trends will be displayed here.</p>
            </div>
          </CardContent>
        </Card>

        {/* Activity Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Breakdown</CardTitle>
            <CardDescription>Detailed view of your daily activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-muted-foreground italic">Calls, appraisals, and open homes tracking to be implemented.</p>
            </div>
          </CardContent>
        </Card>

        {/* Pace Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Pace Analysis</CardTitle>
            <CardDescription>Are you on track to hit your quarterly goals?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-muted-foreground italic">Pace projections and required daily/weekly activity will be displayed here.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
