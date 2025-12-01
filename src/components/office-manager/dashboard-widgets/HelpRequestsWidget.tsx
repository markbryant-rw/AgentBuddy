import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useHelpRequests } from '@/hooks/useHelpRequests';

export const HelpRequestsWidget = () => {
  const { helpRequests, isLoading } = useHelpRequests();

  const requests = helpRequests || [];
  const pending = requests.filter(r => r.status === 'open').length;
  const inProgress = requests.filter(r => r.status === 'acknowledged').length;
  const resolved = requests.filter(r => r.status === 'resolved').length;
  const urgent = requests.filter(r => r.escalation_level === 'platform_admin' && r.status !== 'resolved').length;

  return (
    <Card className="transition-all hover:shadow-lg border-l-4 border-l-pink-500 bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/20 dark:to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-pink-600" />
            Help Requests
          </CardTitle>
          {urgent > 0 && (
            <Badge variant="destructive" className="gap-1">
              {urgent}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-2xl font-bold">{pending}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{inProgress}</p>
                  <p className="text-xs text-muted-foreground">Acknowledged</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{resolved}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
              </div>
              
              {urgent > 0 && (
                <div className="pt-3 border-t">
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {urgent} urgent request(s)
                  </Badge>
                </div>
              )}
              
              {pending === 0 && inProgress === 0 && (
                <div className="pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>All caught up!</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
