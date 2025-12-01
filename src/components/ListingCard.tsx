import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare, Home } from 'lucide-react';
import { format } from 'date-fns';
import { Listing } from '@/hooks/useListingPipeline';
import { cn } from '@/lib/utils';

interface ListingCardProps {
  listing: Listing;
  onClick: () => void;
  commentCount?: number;
}

export const ListingCard = ({ listing, onClick, commentCount = 0 }: ListingCardProps) => {
  const warmthConfig = {
    hot: {
      border: 'border-l-red-500',
      bg: 'bg-gradient-to-br from-red-50/50 to-white dark:from-red-900/10 dark:to-background',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-500 hover:bg-red-600',
    },
    warm: {
      border: 'border-l-orange-500',
      bg: 'bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-900/10 dark:to-background',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      badge: 'bg-orange-500 hover:bg-orange-600',
    },
    cold: {
      border: 'border-l-blue-500',
      bg: 'bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/10 dark:to-background',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-500 hover:bg-blue-600',
    },
  };

  const config = warmthConfig[listing.warmth];

  return (
    <Card 
      className={cn(
        'group cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border-l-4',
        config.border,
        config.bg
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", config.iconBg)}>
              <Home className={cn("h-4 w-4", config.iconColor)} />
            </div>
            <Badge className={cn("capitalize text-white", config.badge)}>
              {listing.warmth}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <h4 className="font-semibold text-sm mb-1">{listing.address}</h4>
        
        <p className="text-sm text-muted-foreground mb-3">{listing.vendor_name}</p>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  'h-3 w-3',
                  star <= listing.likelihood
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground'
                )}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            {commentCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{commentCount}</span>
              </div>
            )}
            <span>
              {format(new Date(listing.last_contact), 'MMM d')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
