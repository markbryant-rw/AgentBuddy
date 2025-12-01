import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ExternalLink, ThumbsUp, Minus, ThumbsDown } from 'lucide-react';
import { useFlaggedProviders } from '@/hooks/useFlaggedProviders';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function FlaggedProvidersWidget() {
  const { data: flaggedProviders, isLoading } = useFlaggedProviders();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Flagged Service Providers
          </CardTitle>
          <CardDescription>Providers with concerning review patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const providerCount = flaggedProviders?.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Flagged Service Providers
        </CardTitle>
        <CardDescription>
          {providerCount === 0 
            ? 'No providers currently flagged'
            : `${providerCount} provider${providerCount === 1 ? '' : 's'} need${providerCount === 1 ? 's' : ''} review`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {providerCount === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ThumbsUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All providers are in good standing</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flaggedProviders?.slice(0, 5).map((provider) => {
              const category = provider.provider_categories || provider.team_provider_categories;
              const displayName = provider.full_name || provider.company_name || 'Unknown Provider';
              
              return (
                <div
                  key={provider.id}
                  className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{displayName}</h4>
                        {category && (
                          <Badge variant="outline" className="text-xs">
                            {category.name}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1 text-green-600">
                          <ThumbsUp className="h-3 w-3" />
                          <span>{provider.positive_count}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-600">
                          <Minus className="h-3 w-3" />
                          <span>{provider.neutral_count}</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-600">
                          <ThumbsDown className="h-3 w-3" />
                          <span>{provider.negative_count}</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        Flagged {formatDistanceToNow(new Date(provider.flagged_at), { addSuffix: true })}
                      </p>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => navigate('/directory')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {providerCount > 5 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate('/office-manager/support')}
              >
                View All ({providerCount})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
