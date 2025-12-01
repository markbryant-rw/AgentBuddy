import { useState } from 'react';
import { Transaction } from '@/hooks/useTransactions';
import { calculatePriceAlignment } from '@/lib/priceAlignmentUtils';
import { PriceAlignmentIndicator } from './PriceAlignmentIndicator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, ArrowUpDown } from 'lucide-react';
import { differenceInDays } from 'date-fns';

const STAGE_CONFIG: Record<string, { label: string; order: number }> = {
  signed: { label: '01. Signed', order: 1 },
  live: { label: '02. Live', order: 2 },
  contract: { label: '03. Under Contract', order: 3 },
  unconditional: { label: '04. Unconditional', order: 4 },
  settled: { label: '05. Settled', order: 5 },
};

interface StockBoardTableProps {
  transactions: Transaction[];
  onView: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
}

type SortField = 'address' | 'stage' | 'vendor_price' | 'team_price' | 'alignment' | 'days';
type SortDirection = 'asc' | 'desc';

export function StockBoardTable({ transactions, onView, onEdit }: StockBoardTableProps) {
  const [sortField, setSortField] = useState<SortField>('stage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'address':
        aValue = a.address || '';
        bValue = b.address || '';
        break;
      case 'stage':
        aValue = STAGE_CONFIG[a.stage]?.order || 999;
        bValue = STAGE_CONFIG[b.stage]?.order || 999;
        break;
      case 'vendor_price':
        aValue = a.vendor_price || 0;
        bValue = b.vendor_price || 0;
        break;
      case 'team_price':
        aValue = a.team_price || 0;
        bValue = b.team_price || 0;
        break;
      case 'alignment':
        aValue = calculatePriceAlignment(a.vendor_price, a.team_price).percentage;
        bValue = calculatePriceAlignment(b.vendor_price, b.team_price).percentage;
        break;
      case 'days':
        // Sort by live_date if available, otherwise put at the end
        aValue = a.live_date ? new Date(a.live_date).getTime() : Infinity;
        bValue = b.live_date ? new Date(b.live_date).getTime() : Infinity;
        break;
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 -ml-2"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-3 w-3" />
    </Button>
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortButton field="address">Address</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="stage">Stage</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="vendor_price">Vendor Price</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="team_price">Team Price</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="alignment">Alignment</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="days">Days on Market</SortButton>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            sortedTransactions.map((transaction) => {
              const alignment = calculatePriceAlignment(
                transaction.vendor_price,
                transaction.team_price
              );

              return (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{transaction.address}</div>
                      {transaction.suburb && (
                        <div className="text-xs text-muted-foreground">
                          {transaction.suburb}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {STAGE_CONFIG[transaction.stage]?.label || transaction.stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.vendor_price
                      ? `$${transaction.vendor_price.toLocaleString()}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {transaction.team_price
                      ? `$${transaction.team_price.toLocaleString()}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <PriceAlignmentIndicator
                      vendorPrice={transaction.vendor_price}
                      teamPrice={transaction.team_price}
                      compact
                    />
                  </TableCell>
                  <TableCell>
                    {transaction.live_date ? (
                      (() => {
                        // Stop counting at unconditional date if it exists, otherwise use current date
                        const endDate = transaction.unconditional_date 
                          ? new Date(transaction.unconditional_date)
                          : new Date();
                        const daysOnMarket = differenceInDays(endDate, new Date(transaction.live_date));
                        const isApproaching90 = daysOnMarket >= 70;
                        const isOver90 = daysOnMarket >= 90;
                        
                        return (
                          <span className={
                            isOver90 
                              ? 'text-destructive font-semibold' 
                              : isApproaching90 
                                ? 'text-amber-600 font-medium' 
                                : ''
                          }>
                            {daysOnMarket} {daysOnMarket === 1 ? 'day' : 'days'}
                          </span>
                        );
                      })()
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(transaction)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(transaction)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
