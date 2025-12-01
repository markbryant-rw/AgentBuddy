import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { useKPITrackerData } from '@/hooks/useKPITrackerData';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export const ExportActionsCard = () => {
  const { personal, team } = useKPITrackerData();
  const { toast } = useToast();

  const handleExportCSV = () => {
    try {
      const headers = ['Metric', 'Today', 'This Week', 'Weekly Goal'];
      const rows = [
        ['Calls', personal.kpis.calls.today, personal.kpis.calls.week, personal.kpis.calls.goal],
        ['SMS', personal.kpis.sms.today, personal.kpis.sms.week, personal.kpis.sms.goal],
        ['Appraisals', personal.kpis.appraisals.today, personal.kpis.appraisals.week, personal.kpis.appraisals.goal],
        ['Open Homes', personal.kpis.openHomes.today, personal.kpis.openHomes.week, personal.kpis.openHomes.goal],
        ['', '', '', ''],
        ['CCH (Daily)', personal.cch.daily.toFixed(2), '', personal.cch.dailyTarget.toFixed(2)],
        ['CCH (Weekly)', '', personal.cch.weekly.toFixed(2), personal.cch.weeklyTarget.toFixed(2)],
      ];

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kpi-tracker-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: 'Your KPI data has been downloaded as CSV.',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Unable to export data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleExportCSV} variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
          <Button onClick={handlePrint} variant="outline" className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
