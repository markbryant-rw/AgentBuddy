import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFeatureRequests } from '@/hooks/useFeatureRequests';
import { useSalesInquiries } from '@/hooks/useSalesInquiries';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, DollarSign } from 'lucide-react';

interface PendingActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PendingActionsDialog = ({ open, onOpenChange }: PendingActionsDialogProps) => {
  const { featureRequests, isLoadingRequests } = useFeatureRequests();
  const { inquiries, isLoading: inquiriesLoading } = useSalesInquiries();

  const pendingFeatures = featureRequests?.filter(r => r.status === 'pending') || [];
  const newInquiries = inquiries?.filter(i => i.status === 'new') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Pending Actions ({pendingFeatures.length + newInquiries.length})
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="features" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="features" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feature Requests ({pendingFeatures.length})
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Sales Inquiries ({newInquiries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="features" className="flex-1 overflow-auto">
            {isLoadingRequests ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : pendingFeatures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending feature requests
              </div>
            ) : (
              <div className="space-y-3">
                {pendingFeatures.map((request) => (
                  <Card key={request.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-base">{request.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {request.description}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {request.vote_count} votes
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between pt-0">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sales" className="flex-1 overflow-auto">
            {inquiriesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : newInquiries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No new sales inquiries
              </div>
            ) : (
              <div className="space-y-3">
                {newInquiries.map((inquiry) => (
                  <Card key={inquiry.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{inquiry.full_name}</CardTitle>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span>{inquiry.email}</span>
                        <span>•</span>
                        <span>{inquiry.company_name}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between pt-0">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Contact
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
