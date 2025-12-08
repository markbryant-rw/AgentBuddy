import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, Download, FileText } from 'lucide-react';
import { useBillingHistory } from '@/hooks/useBillingHistory';
import { useUserSubscription } from '@/hooks/useUserSubscription';

export const BillingHistoryCard = () => {
  const { invoices, isLoading } = useBillingHistory();
  const { subscription } = useUserSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show for users without a subscription
  if (!subscription || !subscription.plan) {
    return null;
  }

  if (subscription.managedBy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>View your invoices and receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center space-y-2">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Billing history is managed by {subscription.managedBy}
            </p>
            <p className="text-xs text-muted-foreground">
              Contact your administrator for invoice details
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: { variant: 'default' as const, label: 'Paid' },
      pending: { variant: 'secondary' as const, label: 'Pending' },
      failed: { variant: 'destructive' as const, label: 'Failed' },
    };
    return variants[status as keyof typeof variants] || variants.paid;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Billing History
        </CardTitle>
        <CardDescription>View and download your invoices</CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No invoices yet</p>
            <p className="text-xs text-muted-foreground">
              Your invoices will appear here once you start your subscription
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const status = getStatusBadge(invoice.status);
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.date}</TableCell>
                      <TableCell>{invoice.description}</TableCell>
                      <TableCell className="text-right">
                        ${invoice.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
