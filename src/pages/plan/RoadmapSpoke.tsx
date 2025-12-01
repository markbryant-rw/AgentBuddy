import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Compass, Target, Calendar, TrendingUp } from 'lucide-react';
import { getQuarter, addQuarters, format, startOfQuarter, endOfQuarter } from 'date-fns';

export default function RoadmapSpoke() {
  const navigate = useNavigate();
  const nextQuarter = addQuarters(new Date(), 1);
  const quarterNum = getQuarter(nextQuarter);
  const year = nextQuarter.getFullYear();
  const quarterStart = startOfQuarter(nextQuarter);
  const quarterEnd = endOfQuarter(nextQuarter);

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
                <h1 className="text-2xl font-bold">Next Quarter Planning</h1>
                <p className="text-sm text-muted-foreground">
                  Q{quarterNum} {year} • {format(quarterStart, 'MMM d')} - {format(quarterEnd, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <Button size="lg" variant="default">
              Finalize Plan
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Goal Setting */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950/30">
                <Compass className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Set Your Goals</CardTitle>
                <CardDescription>Define targets for the upcoming quarter</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Appraisals Target</h3>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Set your quarterly appraisals goal
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground italic">Goal setting interface to be implemented</p>
                </div>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">CCH Target</h3>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Set your weekly CCH goal
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground italic">Goal setting interface to be implemented</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projected Targets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Projected Targets
            </CardTitle>
            <CardDescription>Based on your current performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-muted-foreground italic">AI-powered projections based on historical data will be displayed here.</p>
            </div>
          </CardContent>
        </Card>

        {/* Strategic Objectives */}
        <Card>
          <CardHeader>
            <CardTitle>Strategic Objectives</CardTitle>
            <CardDescription>What do you want to focus on this quarter?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-muted-foreground italic">Strategic planning notes and objectives section to be implemented.</p>
            </div>
          </CardContent>
        </Card>

        {/* Key Dates & Milestones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Key Dates & Milestones
            </CardTitle>
            <CardDescription>Important dates to remember</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-muted-foreground italic">Milestone tracking and date management to be implemented.</p>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Target Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Target Allocation</CardTitle>
            <CardDescription>Break down your quarterly goals week by week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-muted-foreground italic">Drag-and-drop weekly allocation interface to be implemented.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
