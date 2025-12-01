import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, TrendingUp, Target, CheckCircle2 } from 'lucide-react';
import { getQuarter, subQuarters, format, startOfQuarter, endOfQuarter } from 'date-fns';

export default function ReviewSpoke() {
  const navigate = useNavigate();
  const lastQuarter = subQuarters(new Date(), 1);
  const quarterNum = getQuarter(lastQuarter);
  const year = lastQuarter.getFullYear();
  const quarterStart = startOfQuarter(lastQuarter);
  const quarterEnd = endOfQuarter(lastQuarter);

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
                <h1 className="text-2xl font-bold">Last Quarter Review</h1>
                <p className="text-sm text-muted-foreground">
                  Q{quarterNum} {year} • {format(quarterStart, 'MMM d')} - {format(quarterEnd, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950/30">
                <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>Quarter Summary</CardTitle>
                <CardDescription>Final performance metrics and achievements</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Appraisals Completed</span>
                </div>
                <p className="text-2xl font-bold">-- / --</p>
                <p className="text-sm text-muted-foreground">Target achievement</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">CCH Achieved</span>
                </div>
                <p className="text-2xl font-bold">-- hrs</p>
                <p className="text-sm text-muted-foreground">Weekly average</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Overall Achievement</span>
                </div>
                <p className="text-2xl font-bold">--%</p>
                <p className="text-sm text-muted-foreground">Of all targets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What Went Well */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              What Went Well
            </CardTitle>
            <CardDescription>Highlights and achievements from the quarter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-muted-foreground italic">Analysis and highlights will be displayed here based on your quarterly performance data.</p>
            </div>
          </CardContent>
        </Card>

        {/* Areas for Improvement */}
        <Card>
          <CardHeader>
            <CardTitle>Areas for Improvement</CardTitle>
            <CardDescription>Opportunities to focus on next quarter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-muted-foreground italic">Insights and improvement areas will be displayed here based on your performance patterns.</p>
            </div>
          </CardContent>
        </Card>

        {/* Key Learnings */}
        <Card>
          <CardHeader>
            <CardTitle>Key Learnings & Notes</CardTitle>
            <CardDescription>Reflections and takeaways</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-muted-foreground italic">Personal notes and learnings section to be implemented.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
