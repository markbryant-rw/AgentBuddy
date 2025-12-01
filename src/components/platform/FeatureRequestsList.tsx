import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ThumbsUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FeatureRequestComments } from './FeatureRequestComments';

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  vote_count: number;
  priority?: string;
  created_at: string;
}

interface FeatureRequestsListProps {
  requests: FeatureRequest[] | undefined;
  isLoading: boolean;
}

export const FeatureRequestsList = ({ requests, isLoading }: FeatureRequestsListProps) => {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('feature_requests')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      toast.success('Status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'secondary', icon: Clock },
      in_progress: { variant: 'default', icon: Clock },
      completed: { variant: 'default', icon: CheckCircle },
      rejected: { variant: 'destructive', icon: XCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Requests</CardTitle>
          <CardDescription>Top requests by votes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Requests</CardTitle>
        <CardDescription>Top requests by votes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests && requests.length > 0 ? (
          requests.slice(0, 10).map((request) => (
            <div key={request.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{request.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {request.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 text-sm">
                    <ThumbsUp className="h-4 w-4" />
                    <span className="font-medium">{request.vote_count}</span>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </div>
              {request.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'in_progress' })}
                  >
                    Start
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'completed' })}
                  >
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'rejected' })}
                  >
                    Reject
                  </Button>
                </div>
              )}
              <div className="border-t pt-2">
                <FeatureRequestComments featureRequestId={request.id} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No feature requests yet</p>
        )}
      </CardContent>
    </Card>
  );
};
