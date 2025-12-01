import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, Building2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SalesInquiry {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  inquiry_type: string;
  status: string;
  created_at: string;
}

interface SalesInquiriesListProps {
  inquiries: SalesInquiry[] | undefined;
  isLoading: boolean;
  onUpdateStatus: (id: string, status: string) => void;
  isUpdating: boolean;
}

export const SalesInquiriesList = ({ inquiries, isLoading, onUpdateStatus, isUpdating }: SalesInquiriesListProps) => {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      new: 'default',
      contacted: 'secondary',
      qualified: 'default',
      converted: 'default',
      lost: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
          <CardDescription>Recent sales inquiries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Pipeline</CardTitle>
        <CardDescription>Recent sales inquiries</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {inquiries && inquiries.length > 0 ? (
          inquiries.slice(0, 10).map((inquiry) => (
            <div key={inquiry.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium truncate">{inquiry.full_name}</h4>
                    {getStatusBadge(inquiry.status)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">{inquiry.company_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{inquiry.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{inquiry.phone}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={inquiry.status}
                  onValueChange={(value) => onUpdateStatus(inquiry.id, value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" asChild>
                  <a href={`mailto:${inquiry.email}`}>
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </a>
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No sales inquiries yet</p>
        )}
      </CardContent>
    </Card>
  );
};
