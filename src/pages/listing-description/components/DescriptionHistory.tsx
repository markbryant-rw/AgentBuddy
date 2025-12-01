import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ListingDescription } from '@/hooks/useListingDescriptions';

interface DescriptionHistoryProps {
  descriptions: ListingDescription[];
  onLoad: (description: ListingDescription) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export const DescriptionHistory = ({
  descriptions,
  onLoad,
  onDelete,
  isDeleting,
}: DescriptionHistoryProps) => {
  if (descriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Description History</CardTitle>
          <CardDescription>Your saved descriptions will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No saved descriptions yet. Generate and save your first listing description!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Description History</CardTitle>
        <CardDescription>
          {descriptions.length} saved {descriptions.length === 1 ? 'description' : 'descriptions'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {descriptions.map((description) => (
              <Card key={description.id} className="border">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{description.address}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {description.bedrooms} bed · {description.bathrooms} bath · {description.listing_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Target: {description.target_audience}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onLoad(description)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDelete(description.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-2 rounded text-xs">
                      <p className="line-clamp-2">
                        {description.generated_descriptions.short}
                      </p>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(description.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
