import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Pencil, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { Transaction } from '@/hooks/useTransactions';
import { useMemo, useState } from 'react';
import { AssigneeAvatar } from './AssigneeAvatar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { VendorReportingDialog } from '@/components/vendor-reporting/VendorReportingDialog';
import { DealHistoryBadge } from './DealHistoryBadge';

interface TransactionKanbanCardProps {
  transaction: Transaction;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
}

export const TransactionKanbanCard = ({ transaction, onClick, onEdit }: TransactionKanbanCardProps) => {
  const queryClient = useQueryClient();
  const [isVendorReportOpen, setIsVendorReportOpen] = useState(false);
  const progress = transaction.tasks_total > 0
    ? Math.round((transaction.tasks_done / transaction.tasks_total) * 100)
    : 0;

  // Fetch lead salesperson profile
  const { data: leadSalespersonProfile } = useQuery({
    queryKey: ['profile', transaction.assignees?.lead_salesperson],
    queryFn: async () => {
      if (!transaction.assignees?.lead_salesperson) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', transaction.assignees.lead_salesperson)
        .single();
      return data;
    },
    enabled: !!transaction.assignees?.lead_salesperson,
  });

  // Dynamic border color based on stage
  const borderColorClass = useMemo(() => {
    switch (transaction.stage) {
      case 'signed': return 'border-l-rose-500';
      case 'live': return 'border-l-indigo-500';
      case 'contract': return 'border-l-amber-500';
      case 'unconditional': return 'border-l-teal-500';
      case 'settled': return 'border-l-gray-500';
      default: return 'border-l-primary';
    }
  }, [transaction.stage]);

  return (
    <Card
      className={cn(
        "p-3 hover:shadow-md transition-all cursor-pointer border-l-4 group relative",
        borderColorClass
      )}
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* Deal History Badge - if property has been under contract before */}
        {transaction.deal_history && transaction.deal_history.length > 0 && (
          <div className="mb-2">
            <DealHistoryBadge collapseCount={transaction.deal_history.length} />
          </div>
        )}

        {/* Address with Avatar & Edit Button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm line-clamp-1">{transaction.address}</h4>
            {transaction.suburb && (
              <p className="text-xs text-muted-foreground">{transaction.suburb}</p>
            )}
          </div>
          
          {/* Avatar and Action Buttons Row */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {leadSalespersonProfile && (
              <AssigneeAvatar 
                assignee={leadSalespersonProfile} 
                size="sm"
              />
            )}
            {(transaction.stage === 'live' || transaction.stage === 'contract') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVendorReportOpen(true);
                }}
                title="Generate Vendor Report"
              >
                <FileText className="h-3 w-3" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(e);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Vendor */}
        <p className="text-xs text-muted-foreground truncate">
          {transaction.client_name}
        </p>

        {/* Progress Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
        </div>

        {/* Bottom Row: Stage-specific dates */}
        <div className="space-y-1">
          {transaction.stage === 'signed' && (
            <>
              {transaction.listing_signed_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span className="truncate">Signed: {format(new Date(transaction.listing_signed_date), 'dd MMM')}</span>
                </div>
              )}
              {transaction.live_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span className="truncate">Live: {format(new Date(transaction.live_date), 'dd MMM')}</span>
                </div>
              )}
            </>
          )}
          
          {transaction.stage === 'live' && (
            <>
              {transaction.listing_expires_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span className="truncate">Expires: {format(new Date(transaction.listing_expires_date), 'dd MMM')}</span>
                </div>
              )}
              {transaction.auction_deadline_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span className="truncate">Auction: {format(new Date(transaction.auction_deadline_date), 'dd MMM')}</span>
                </div>
              )}
            </>
          )}
          
          {transaction.stage === 'contract' && transaction.unconditional_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="truncate">Unconditional: {format(new Date(transaction.unconditional_date), 'dd MMM')}</span>
            </div>
          )}
          
          {transaction.stage === 'unconditional' && (
            <>
              {transaction.settlement_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span className="truncate">Pre-Settlement: {format(new Date(transaction.settlement_date), 'dd MMM')}</span>
                </div>
              )}
              {transaction.expected_settlement && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span className="truncate">Settlement: {format(new Date(transaction.expected_settlement), 'dd MMM')}</span>
                </div>
              )}
            </>
          )}
          
          {transaction.stage === 'settled' && transaction.expected_settlement && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="truncate">Settled: {format(new Date(transaction.expected_settlement), 'dd MMM')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Vendor Reporting Dialog */}
      <VendorReportingDialog
        isOpen={isVendorReportOpen}
        onClose={() => setIsVendorReportOpen(false)}
        transactionId={transaction.id}
        transactionData={{
          address: transaction.address,
          suburb: transaction.suburb,
          vendor_names: transaction.vendor_names || [],
          live_date: transaction.live_date || null,
        }}
        onReportSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['vendor-reports', transaction.id] });
        }}
      />
    </Card>
  );
};
