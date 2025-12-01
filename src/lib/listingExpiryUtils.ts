export const calculateDaysOnMarket = (liveDate: string | null): number | null => {
  if (!liveDate) return null;
  const live = new Date(liveDate);
  const today = new Date();
  const diffTime = today.getTime() - live.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const calculateDaysUntilExpiry = (expiryDate: string | null): number | null => {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export type ExpiryStatus = 'critical' | 'warning' | 'watch' | 'good' | 'expired' | 'unknown';

export interface ExpiryStatusInfo {
  status: ExpiryStatus;
  label: string;
  variant: 'destructive' | 'default' | 'secondary' | 'outline';
  color: string;
}

export const getExpiryStatus = (daysUntilExpiry: number | null): ExpiryStatusInfo => {
  if (daysUntilExpiry === null) {
    return { 
      status: 'unknown', 
      label: 'Not Set', 
      variant: 'outline',
      color: 'text-muted-foreground'
    };
  }
  
  if (daysUntilExpiry < 0) {
    return { 
      status: 'expired', 
      label: 'EXPIRED', 
      variant: 'destructive',
      color: 'text-destructive'
    };
  }
  
  if (daysUntilExpiry < 7) {
    return { 
      status: 'critical', 
      label: 'Critical', 
      variant: 'destructive',
      color: 'text-destructive'
    };
  }
  
  if (daysUntilExpiry < 21) {
    return { 
      status: 'warning', 
      label: 'Warning', 
      variant: 'default',
      color: 'text-orange-600'
    };
  }
  
  if (daysUntilExpiry < 45) {
    return { 
      status: 'watch', 
      label: 'Watch', 
      variant: 'secondary',
      color: 'text-yellow-600'
    };
  }
  
  return { 
    status: 'good', 
    label: 'Good', 
    variant: 'outline',
    color: 'text-green-600'
  };
};

export const extendExpiryDate = (currentDate: string | null, extensionDays: number): string => {
  const baseDate = currentDate ? new Date(currentDate) : new Date();
  const newDate = new Date(baseDate);
  newDate.setDate(newDate.getDate() + extensionDays);
  return newDate.toISOString().split('T')[0];
};
