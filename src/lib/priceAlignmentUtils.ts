export interface PriceAlignment {
  percentage: number;
  difference: number;
  status: 'aligned' | 'misaligned' | 'pending';
  color: string;
  bgColor: string;
  icon: string;
}

export const calculatePriceAlignment = (
  vendorPrice?: number,
  teamPrice?: number
): PriceAlignment => {
  if (!vendorPrice || !teamPrice) {
    return {
      percentage: 0,
      difference: 0,
      status: 'pending',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/10',
      icon: 'clock',
    };
  }

  const difference = Math.abs(vendorPrice - teamPrice);
  const percentage = (difference / teamPrice) * 100;
  const isAligned = percentage <= 10;

  return {
    percentage: Math.round(percentage * 10) / 10,
    difference,
    status: isAligned ? 'aligned' : 'misaligned',
    color: isAligned ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
    bgColor: isAligned ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20',
    icon: isAligned ? 'check-circle' : 'alert-triangle',
  };
};

export const formatPriceDelta = (vendorPrice?: number, teamPrice?: number): string => {
  if (!vendorPrice || !teamPrice) return '';
  const difference = vendorPrice - teamPrice;
  const sign = difference > 0 ? '+' : '';
  return `${sign}$${Math.abs(difference).toLocaleString()}`;
};
