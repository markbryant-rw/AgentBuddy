import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHelpRequests } from '@/hooks/useHelpRequests';
import { HelpRequestCard } from './HelpRequestCard';
import { HelpCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HelpRequestsWidgetProps {
  title?: string;
  description?: string;
  maxItems?: number;
  filterFn?: (request: any) => boolean;
  showActions?: boolean;
  onEscalate?: (id: string) => void;
  onResolve?: (id: string) => void;
}

export function HelpRequestsWidget({
  title = 'Help Requests',
  description = 'Recent support requests',
  maxItems = 5,
  filterFn,
  showActions = true,
  onEscalate,
  onResolve,
}: HelpRequestsWidgetProps) {
  const { helpRequests = [], isLoading, escalateHelpRequest, resolveHelpRequest } = useHelpRequests();
  const navigate = useNavigate();

  const filteredRequests = filterFn && helpRequests 
    ? helpRequests.filter(filterFn) 
    : helpRequests;

  const displayRequests = filteredRequests?.slice(0, maxItems);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {displayRequests && displayRequests.length > 0 ? (
          <div className="space-y-3">
            {displayRequests.map((request) => (
              <HelpRequestCard
                key={request.id}
                request={request}
                onEscalate={onEscalate || escalateHelpRequest}
                onResolve={onResolve || resolveHelpRequest}
                showActions={showActions}
              />
            ))}
            {filteredRequests && filteredRequests.length > maxItems && (
              <Button 
                variant="outline" 
                className="w-full mt-2"
                onClick={() => navigate('/help-requests')}
              >
                View All ({filteredRequests.length})
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No help requests at this time
          </p>
        )}
      </CardContent>
    </Card>
  );
}
