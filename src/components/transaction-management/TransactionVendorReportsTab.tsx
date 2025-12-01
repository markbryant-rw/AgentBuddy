import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VendorReportingDialog } from '@/components/vendor-reporting/VendorReportingDialog';
import { useToast } from '@/hooks/use-toast';

interface TransactionVendorReportsTabProps {
  transactionId: string;
}

interface VendorReportWithCreator {
  id: string;
  transaction_id: string;
  team_id: string;
  created_by: string;
  property_address: string;
  vendor_name: string;
  campaign_week: number;
  buyer_feedback: string;
  desired_outcome: string;
  generated_report: any;
  created_at: string;
  updated_at: string;
  creator_name: string | null;
  vendor_report?: string;
  action_points?: string;
  whatsapp_summary?: string;
}

export const TransactionVendorReportsTab = ({ transactionId }: TransactionVendorReportsTabProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<VendorReportWithCreator | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const { data: transactionData } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('address, suburb, vendor_names, live_date, client_name')
        .eq('id', transactionId)
        .single();
      if (error) throw error;
      return {
        ...data,
        vendor_names: (data.vendor_names as any[]) || []
      };
    },
  });

  const { data: reports, isLoading } = useQuery<VendorReportWithCreator[]>({
    queryKey: ['vendor-reports', transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_reports')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator profiles separately
      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map(r => r.created_by).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);

        return data.map(report => {
          const generatedReport = report.generated_report as any;
          return {
            ...report,
            creator_name: profiles?.find(p => p.id === report.created_by)?.full_name || null,
            vendor_report: generatedReport?.vendorReport || '',
            action_points: generatedReport?.actionPoints || '',
            whatsapp_summary: generatedReport?.whatsappSummary || '',
          };
        });
      }

      return [];
    },
  });

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading reports...</div>;
  }

  const hasReports = reports && reports.length > 0;

  return (
    <div className="space-y-4 p-4">
      {hasReports ? (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Vendor Reports ({reports.length})</h3>
            <Button onClick={() => setIsReportDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate New Report
            </Button>
          </div>

          <div className="space-y-3">
            {reports.map((report) => (
              <Card key={report.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold">Week {report.campaign_week} Report</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Generated {format(new Date(report.created_at), 'MMM d, yyyy')}
                      {report.creator_name && ` by ${report.creator_name}`}
                    </p>
                    {report.vendor_name && (
                      <p className="text-sm text-muted-foreground">Vendor: {report.vendor_name}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedReport(report)}
                  >
                    View Full Report
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No vendor reports yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Generate your first vendor report to track campaign progress and buyer feedback.
            Each report you save here is stored as a weekly snapshot for this campaign.
          </p>
          <Button onClick={() => setIsReportDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      )}

      {/* Always render dialog so it can open regardless of report count */}
      <VendorReportingDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        transactionId={transactionId}
        transactionData={transactionData}
        onReportSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['vendor-reports', transactionId] });
          toast({
            title: "Report Saved",
            description: "Your vendor report has been saved successfully.",
          });
        }}
      />

      {/* Report Viewer Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Week {selectedReport?.campaign_week} Vendor Report
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {selectedReport && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Vendor Report</h3>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {selectedReport.vendor_report}
                  </div>
                </div>
                
                {selectedReport.action_points && (
                  <div>
                    <h3 className="font-semibold mb-2">Action Points</h3>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                      {selectedReport.action_points}
                    </div>
                  </div>
                )}

                {selectedReport.whatsapp_summary && (
                  <div>
                    <h3 className="font-semibold mb-2">WhatsApp Summary</h3>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-muted p-4 rounded-lg">
                      {selectedReport.whatsapp_summary}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
