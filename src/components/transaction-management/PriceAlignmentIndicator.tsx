import { calculatePriceAlignment, formatPriceDelta } from '@/lib/priceAlignmentUtils';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PriceAlignmentIndicatorProps {
  vendorPrice?: number;
  teamPrice?: number;
  compact?: boolean;
}

export function PriceAlignmentIndicator({ 
  vendorPrice, 
  teamPrice,
  compact = false 
}: PriceAlignmentIndicatorProps) {
  const alignment = calculatePriceAlignment(vendorPrice, teamPrice);
  
  const icons = {
    'check-circle': CheckCircle,
    'alert-triangle': AlertTriangle,
    'clock': Clock,
  };
  
  const Icon = icons[alignment.icon as keyof typeof icons];

  if (compact) {
    return (
      <Badge 
        variant="outline"
        className={`${alignment.bgColor} ${alignment.color} border-0`}
      >
        <Icon className="h-3 w-3 mr-1" />
        {alignment.status === 'pending' ? 'Pending' : `${alignment.percentage}%`}
      </Badge>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${alignment.bgColor}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 ${alignment.color}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm">
              {alignment.status === 'aligned' && 'Prices Aligned'}
              {alignment.status === 'misaligned' && 'Prices Misaligned'}
              {alignment.status === 'pending' && 'Awaiting Both Prices'}
            </span>
            {alignment.status !== 'pending' && (
              <span className={`font-bold ${alignment.color}`}>
                {alignment.percentage}%
              </span>
            )}
          </div>
          {alignment.status !== 'pending' && (
            <p className="text-xs text-muted-foreground">
              {alignment.status === 'aligned' 
                ? `Within acceptable range (≤10%). Difference: ${formatPriceDelta(vendorPrice, teamPrice)}`
                : `Outside acceptable range (>10%). Vendor expectations may need managing.`
              }
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
