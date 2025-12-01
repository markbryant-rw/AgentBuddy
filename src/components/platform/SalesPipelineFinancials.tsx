import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgencyFinancials } from '@/hooks/useAgencyFinancials';
import { DollarSign, TrendingUp, Target, Percent } from 'lucide-react';

export const SalesPipelineFinancials = () => {
  const { totalMRR, totalARR, averageDealSize, isLoading } = useAgencyFinancials();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading financial data...</div>;
  }

  return (
    <div className="grid md:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total MRR</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalMRR)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Monthly recurring revenue
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total ARR</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalARR)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Annual recurring revenue
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(averageDealSize)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Average subscription value
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">--</div>
          <p className="text-xs text-muted-foreground mt-1">
            Coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
