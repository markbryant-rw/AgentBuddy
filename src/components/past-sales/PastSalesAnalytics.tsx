import { PastSale } from "@/hooks/usePastSales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

interface PastSalesAnalyticsProps {
  analytics: {
    totalSalesValue: number;
    leadSourceBreakdown: Record<string, number>;
    statusBreakdown: Record<string, number>;
    topSuburbs: Array<{ suburb: string; count: number; totalValue: number; averageValue: number }>;
    monthlySales: Array<{ month: string; count: number; value: number }>;
    conversionRate: number;
    averageDaysToConvert: number;
  };
  pastSales: PastSale[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const PastSalesAnalytics = ({ analytics }: PastSalesAnalyticsProps) => {
  const leadSourceData = Object.entries(analytics.leadSourceBreakdown).map(([name, value]) => ({
    name,
    value,
  }));

  const statusData = Object.entries(analytics.statusBreakdown).map(([name, value]) => ({
    name: name.replace(/_/g, " "),
    value,
  }));

  const formatCurrency = (value: number) => {
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  return (
    <div className="space-y-6">
      {/* Monthly Sales Volume */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Sales Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.monthlySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "value") return formatCurrency(value);
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="Sales Count" />
              <Bar dataKey="value" fill="#82ca9d" name="Sales Value" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lead Source Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Source Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Suburbs */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Suburbs</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.topSuburbs.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="suburb" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="totalValue" fill="#8884d8" name="Total Value" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">
                {analytics.conversionRate.toFixed(1)}%
              </div>
              <p className="text-muted-foreground mt-2">
                Listings won from total opportunities
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Time to Convert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">
                {Math.round(analytics.averageDaysToConvert)} days
              </div>
              <p className="text-muted-foreground mt-2">
                From first contact to listing signed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PastSalesAnalytics;