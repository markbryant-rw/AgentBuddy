import { useState, useMemo } from 'react';
import { OfficePageHeader } from '@/components/office-manager/OfficePageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { calculateDaysOnMarket, calculateDaysUntilExpiry, getExpiryStatus } from '@/lib/listingExpiryUtils';
import { ExtendListingDialog } from '@/components/transaction-management/ExtendListingDialog';
import { toast } from 'sonner';
import { ExternalLink, Loader2, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function OfficeListingExpiry() {
  const { activeOffice } = useOfficeSwitcher();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [extendDialog, setExtendDialog] = useState<{ open: boolean; transaction?: any }>({ open: false });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['office-expiry-listings', activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return [];

      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('agency_id', activeOffice.id);

      if (!teams) return [];

      const teamIds = teams.map(t => t.id);

      const { data, error } = await supabase
        .from('transactions')
        .select('id, address, suburb, stage, live_date, listing_expires_date, team_id, assignees')
        .in('team_id', teamIds)
        .in('stage', ['signed', 'live'])
        .eq('archived', false);

      if (error) throw error;

      return (data || []).map(t => ({
        ...t,
        team_name: teams.find(team => team.id === t.team_id)?.name || 'Unknown Team',
        daysOnMarket: calculateDaysOnMarket(t.live_date),
        daysUntilExpiry: calculateDaysUntilExpiry(t.listing_expires_date),
        expiryStatus: getExpiryStatus(calculateDaysUntilExpiry(t.listing_expires_date)),
      }));
    },
    enabled: !!activeOffice?.id,
    staleTime: 2 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-expiry-listings'] });
      toast.success('Listing updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update listing');
      console.error(error);
    },
  });

  const handleExtend = async (extensionDays: number) => {
    if (!extendDialog.transaction) return;
    
    const currentDate = extendDialog.transaction.listing_expires_date || new Date().toISOString().split('T')[0];
    const baseDate = new Date(currentDate);
    const newDate = new Date(baseDate);
    newDate.setDate(newDate.getDate() + extensionDays);
    
    await updateMutation.mutateAsync({
      id: extendDialog.transaction.id,
      updates: { listing_expires_date: newDate.toISOString().split('T')[0] }
    });
    
    setExtendDialog({ open: false });
  };

  const processedListings = useMemo(() => {
    let filtered = transactions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.address?.toLowerCase().includes(query) ||
        t.suburb?.toLowerCase().includes(query) ||
        t.team_name?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.expiryStatus.status === statusFilter);
    }

    return filtered.sort((a, b) => {
      const aDays = a.daysUntilExpiry ?? Infinity;
      const bDays = b.daysUntilExpiry ?? Infinity;
      return aDays - bDays;
    });
  }, [transactions, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = transactions.length;
    const critical = transactions.filter(t => ['critical', 'expired'].includes(t.expiryStatus.status)).length;
    const avgDOM = transactions.length > 0
      ? Math.round(transactions.reduce((sum, t) => sum + (t.daysOnMarket || 0), 0) / transactions.length)
      : 0;
    const expiringThisMonth = transactions.filter(t => {
      if (!t.listing_expires_date) return false;
      const expiry = new Date(t.listing_expires_date);
      const now = new Date();
      return expiry.getMonth() === now.getMonth() && expiry.getFullYear() === now.getFullYear();
    }).length;

    return { total, critical, avgDOM, expiringThisMonth };
  }, [transactions]);

  return (
    <div className="min-h-screen bg-background">
      <OfficePageHeader
        title="Listing Expiry Report"
        description={`Monitor agency agreement expiry dates${activeOffice ? ` for ${activeOffice.name}` : ''}`}
      />

      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Active Listings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
              <p className="text-xs text-muted-foreground">Critical/Expired</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.avgDOM}</div>
              <p className="text-xs text-muted-foreground">Avg Days on Market</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.expiringThisMonth}</div>
              <p className="text-xs text-muted-foreground">Expiring This Month</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>Active Listings</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="watch">Watch</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Days on Market</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-right">Days Until Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedListings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell className="font-medium">{listing.address}</TableCell>
                      <TableCell>{listing.team_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{listing.stage}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{listing.daysOnMarket || 'N/A'}</TableCell>
                      <TableCell>{listing.listing_expires_date || 'Not Set'}</TableCell>
                      <TableCell className="text-right">
                        {listing.daysUntilExpiry !== null ? listing.daysUntilExpiry : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={listing.expiryStatus.variant}>
                          {listing.expiryStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExtendDialog({ open: true, transaction: listing })}
                          >
                            Extend
                          </Button>
                          <Button size="sm" variant="ghost">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!isLoading && processedListings.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No listings found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {extendDialog.open && extendDialog.transaction && (
        <ExtendListingDialog
          open={extendDialog.open}
          onOpenChange={(open) => setExtendDialog({ open })}
          currentExpiryDate={extendDialog.transaction.listing_expires_date}
          onConfirm={async (newDate) => {
            await updateMutation.mutateAsync({
              id: extendDialog.transaction!.id,
              updates: { listing_expires_date: newDate }
            });
          }}
          propertyAddress={extendDialog.transaction.address}
        />
      )}
    </div>
  );
}
