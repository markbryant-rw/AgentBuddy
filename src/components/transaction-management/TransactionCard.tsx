import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { Transaction } from '@/hooks/useTransactions';
import { getStageColor } from '@/lib/stageColors';
import { PriceAlignmentIndicator } from './PriceAlignmentIndicator';
import { calculateDaysOnMarket } from '@/lib/listingExpiryUtils';
import { cn } from '@/lib/utils';

interface TransactionCardProps {
  transaction: Transaction;
  onClick: () => void;
}

const statusLabels: Record<string, string> = {
  signed: 'Signed',
  live: 'Live',
  contract: 'Under Contract',
  unconditional: 'Unconditional',
  settled: 'Settled',
};

export const TransactionCard = ({ transaction, onClick }: TransactionCardProps) => {
  const stageColor = getStageColor(transaction.stage);
  const daysOnMarket = calculateDaysOnMarket(transaction.live_date);
  const isHighDOM = daysOnMarket !== null && daysOnMarket >= 70;

  return (
    <Card 
      className={cn(
        "p-3 hover:shadow-md transition-shadow cursor-pointer",
        isHighDOM && "border-2 border-red-500"
      )}
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* 70+ Days DOM Warning */}
        {isHighDOM && (
          <Badge className="bg-red-500 text-white border-red-600 text-xs">
            <Flame className="h-3 w-3 mr-1" />
            {daysOnMarket} Days
          </Badge>
        )}
        
        {/* Address */}
        <h3 className="font-semibold text-sm line-clamp-1">
          {transaction.address}
        </h3>
        
        {/* Client Name */}
        <p className="text-xs text-muted-foreground truncate">
          {transaction.client_name}
        </p>
        
        {/* Status Badge */}
        <Badge 
          variant="outline" 
          className={`text-xs ${stageColor.bg} ${stageColor.text}`}
        >
          {statusLabels[transaction.stage]}
        </Badge>
        
        {/* Price Alignment Badge */}
        {(transaction.vendor_price || transaction.team_price) && (
          <PriceAlignmentIndicator 
            vendorPrice={transaction.vendor_price}
            teamPrice={transaction.team_price}
            compact={true}
          />
        )}
        
        {/* Expected Settlement */}
        {transaction.expected_settlement && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(transaction.expected_settlement), 'dd MMM yyyy')}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};