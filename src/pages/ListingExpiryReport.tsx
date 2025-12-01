import { useState, useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ExternalLink, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { calculateDaysOnMarket, calculateDaysUntilExpiry, getExpiryStatus, type ExpiryStatus } from '@/lib/listingExpiryUtils';
import { ExtendListingDialog } from '@/components/transaction-management/ExtendListingDialog';
import { toast } from 'sonner';

export default function ListingExpiryReport() {
  const { transactions, updateTransaction } = useTransactions();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExpiryStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'expiry' | 'dom'>('expiry');
  const [extendDialog, setExtendDialog] = useState<{
    open: boolean;
    transactionId: string;
    address: string;
    currentExpiry: string | null;
  }>({ open: false, transactionId: '', address: '', currentExpiry: null });

  // Filter active listings
  const activeListings = useMemo(() => {
    return transactions.filter(t => t.stage === 'live' || t.stage === 'signed');
  }, [transactions]);

  // Calculate metrics and apply filters
  const processedListings = useMemo(() => {
    return activeListings
      .map(listing => {
        const dom = calculateDaysOnMarket(listing.live_date);
        const daysUntilExpiry = calculateDaysUntilExpiry(listing.listing_expires_date);
        const expiryInfo = getExpiryStatus(daysUntilExpiry);
        
        return {
          ...listing,
          dom,
          daysUntilExpiry,
          expiryInfo,
        };
      })
      .filter(listing => {
        // Search filter
        const matchesSearch = searchQuery === '' || 
          listing.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.suburb?.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Status filter
        const matchesStatus = statusFilter === 'all' || listing.expiryInfo.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'expiry') {
          // Sort by days until expiry (null values last)
          if (a.daysUntilExpiry === null) return 1;
          if (b.daysUntilExpiry === null) return -1;
          return a.daysUntilExpiry - b.daysUntilExpiry;
        } else {
          // Sort by DOM (descending - highest first)
          if (a.dom === null) return 1;
          if (b.dom === null) return -1;
          return b.dom - a.dom;
        }
      });
  }, [activeListings, searchQuery, statusFilter, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const critical = processedListings.filter(l => l.expiryInfo.status === 'critical').length;
    const totalDom = processedListings.reduce((sum, l) => sum + (l.dom || 0), 0);
    const avgDom = processedListings.length > 0 ? Math.round(totalDom / processedListings.length) : 0;
    const expiringThisMonth = processedListings.filter(l => 
      l.daysUntilExpiry !== null && l.daysUntilExpiry >= 0 && l.daysUntilExpiry <= 30
    ).length;

    return {
      total: activeListings.length,
      critical,
      avgDom,
      expiringThisMonth,
    };
  }, [activeListings, processedListings]);

  const handleExtendListing = async (newExpiryDate: string) => {
    try {
      await updateTransaction({
        id: extendDialog.transactionId,
        updates: {
          listing_expires_date: newExpiryDate,
        },
      });
      
      toast.success('Listing Extended', {
        description: `Agency agreement extended to ${format(new Date(newExpiryDate), 'dd MMM yyyy')}`,
      });
    } catch (error) {
      toast.error('Failed to extend listing agreement');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="transact" currentPage="Listing Expiry Report" />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Listings</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-6 border-destructive/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-3xl font-bold text-destructive">{stats.critical}</p>
                <p className="text-xs text-muted-foreground mt-1">{'<'} 7 days</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Days on Market</p>
                <p className="text-3xl font-bold">{stats.avgDom}</p>
                <p className="text-xs text-muted-foreground mt-1">days</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-orange-500/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring This Month</p>
                <p className="text-3xl font-bold text-orange-600">{stats.expiringThisMonth}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by address or suburb..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ExpiryStatus | 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="watch">Watch</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'expiry' | 'dom')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expiry">Days Until Expiry</SelectItem>
                <SelectItem value="dom">Days on Market</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Listings Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Days on Market</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Days Until Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedListings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No listings found
                  </TableCell>
                </TableRow>
              ) : (
                processedListings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{listing.address}</div>
                        {listing.suburb && (
                          <div className="text-xs text-muted-foreground">{listing.suburb}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {listing.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={listing.dom && listing.dom >= 70 ? 'text-destructive font-semibold' : ''}>
                        {listing.dom !== null ? `${listing.dom} days` : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {listing.listing_expires_date 
                        ? format(new Date(listing.listing_expires_date), 'dd MMM yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={listing.expiryInfo.color}>
                        {listing.daysUntilExpiry !== null 
                          ? `${listing.daysUntilExpiry} days`
                          : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={listing.expiryInfo.variant}>
                        {listing.expiryInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExtendDialog({
                            open: true,
                            transactionId: listing.id,
                            address: listing.address,
                            currentExpiry: listing.listing_expires_date,
                          })}
                        >
                          Extend
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/transaction-coordinating`, '_self')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>

      {/* Extend Listing Dialog */}
      <ExtendListingDialog
        open={extendDialog.open}
        onOpenChange={(open) => setExtendDialog(prev => ({ ...prev, open }))}
        currentExpiryDate={extendDialog.currentExpiry}
        propertyAddress={extendDialog.address}
        onConfirm={handleExtendListing}
      />
    </div>
  );
}
