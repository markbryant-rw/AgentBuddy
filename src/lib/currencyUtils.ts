export const formatCurrency = (value: number | null | undefined): string => {
  if (!value) return '-';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value.toLocaleString()}`;
};

export const formatCurrencyFull = (value: number | null | undefined): string => {
  if (!value) return '';
  return `$${value.toLocaleString()}`;
};

export const parseCurrency = (input: string): number => {
  const cleaned = input.replace(/[$,]/g, '');
  return parseFloat(cleaned) || 0;
};

export const calculateGCI = (propertyValue: number | null | undefined, commissionRate: number = 0.03): number => {
  if (!propertyValue) return 0;
  return propertyValue * commissionRate;
};

export const formatGCI = (gci: number): string => {
  return formatCurrency(gci);
};
