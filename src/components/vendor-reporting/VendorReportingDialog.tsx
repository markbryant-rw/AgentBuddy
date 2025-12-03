import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReportForm from '@/pages/vendor-reporting/components/ReportForm';
import ReportOutput from '@/pages/vendor-reporting/components/ReportOutput';
import { differenceInWeeks, parseISO } from 'date-fns';
import type { GeneratedReport } from '@/pages/vendor-reporting/types';

interface VendorReportingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  transactionData?: {
    address: string;
    suburb?: string;
    vendor_names: any[];
    live_date: string | null;
    client_name?: any;
  };
  onReportSaved?: () => void;
}

const calculateCampaignWeek = (liveDate: string | null): number => {
  if (!liveDate) return 1;
  try {
    const live = parseISO(liveDate);
    const now = new Date();
    const weeksDiff = differenceInWeeks(now, live);
    return Math.max(1, weeksDiff + 1);
  } catch {
    return 1;
  }
};

export const VendorReportingDialog = ({
  isOpen,
  onClose,
  transactionId,
  transactionData,
  onReportSaved
}: VendorReportingDialogProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<'vendor' | 'actions' | 'whatsapp' | null>(null);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    transactionId,
    propertyAddress: '',
    vendorName: '',
    campaignWeek: 1,
    desiredOutcome: '',
    buyerFeedback: '',
    useEmojiFormatting: true,
  });

  useEffect(() => {
    if (transactionData) {
      let vendorName =
        transactionData.vendor_names?.[0]?.full_name ||
        `${transactionData.vendor_names?.[0]?.first_name || ''} ${transactionData.vendor_names?.[0]?.last_name || ''}`.trim();

      if (!vendorName && transactionData.client_name) {
        try {
          const parsed =
            typeof transactionData.client_name === 'string'
              ? JSON.parse(transactionData.client_name)
              : transactionData.client_name;

          if (parsed && (parsed.first_name || parsed.last_name)) {
            vendorName = `${parsed.first_name || ''} ${parsed.last_name || ''}`.trim();
          } else {
            vendorName = String(transactionData.client_name);
          }
        } catch {
          vendorName = String(transactionData.client_name);
        }
      }

      const address = transactionData.suburb
        ? `${transactionData.address}, ${transactionData.suburb}`
        : transactionData.address;
      const calculatedWeek = calculateCampaignWeek(transactionData.live_date);
      
      setFormData(prev => ({
        ...prev,
        propertyAddress: address,
        vendorName: vendorName || prev.vendorName,
        campaignWeek: calculatedWeek,
      }));
    }
  }, [transactionData]);

  const handleGenerate = async (data: typeof formData) => {
    setIsGenerating(true);
    setFormData(data);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: result, error } = await supabase.functions.invoke('generate-vendor-report', {
        body: {
          propertyAddress: data.propertyAddress,
          vendorName: data.vendorName,
          campaignWeek: data.campaignWeek,
          desiredOutcome: data.desiredOutcome,
          buyerFeedback: data.buyerFeedback,
          useEmojiFormatting: data.useEmojiFormatting,
          section: 'all',
        },
      });

      if (error) throw error;

      if (result?.error) {
        if (result.error.includes('rate limit')) {
          toast({
            title: "Rate Limit Reached",
            description: "Too many requests. Please wait a moment and try again.",
            variant: "destructive",
          });
        } else if (result.error.includes('credits exhausted') || result.error.includes('insufficient funds')) {
          toast({
            title: "AI Credits Exhausted",
            description: "Please add more credits to your Lovable AI workspace to continue generating reports.",
            variant: "destructive",
          });
        } else {
          throw new Error(result.error);
        }
        return;
      }

      setGeneratedReport({
        vendorReport: result.report?.vendorReport || '',
        actionPoints: result.report?.actionPoints || '',
        whatsappSummary: result.report?.whatsappSummary || '',
      });

      toast({
        title: "Report Generated",
        description: "Your vendor report has been generated successfully.",
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSection = async (section: 'vendor' | 'actions' | 'whatsapp', customInstructions?: string) => {
    if (!generatedReport) return;

    setRegeneratingSection(section);

    try {
      const { data: result, error } = await supabase.functions.invoke('generate-vendor-report', {
        body: {
          propertyAddress: formData.propertyAddress,
          vendorName: formData.vendorName,
          campaignWeek: formData.campaignWeek,
          desiredOutcome: formData.desiredOutcome,
          buyerFeedback: formData.buyerFeedback,
          useEmojiFormatting: formData.useEmojiFormatting,
          section,
          customInstructions,
        },
      });

      if (error) throw error;

      if (result?.error) {
        throw new Error(result.error);
      }

      setGeneratedReport(prev => ({
        ...prev!,
        ...(section === 'vendor' && { vendorReport: result.report?.vendorReport || prev!.vendorReport }),
        ...(section === 'actions' && { actionPoints: result.report?.actionPoints || prev!.actionPoints }),
        ...(section === 'whatsapp' && { whatsappSummary: result.report?.whatsappSummary || prev!.whatsappSummary }),
      }));

      toast({
        title: "Section Regenerated",
        description: "The section has been regenerated successfully.",
      });
    } catch (error: any) {
      console.error('Error regenerating section:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate section",
        variant: "destructive",
      });
    } finally {
      setRegeneratingSection(null);
    }
  };

  const handleSave = async (editedReport: GeneratedReport) => {
    // Saving vendor reports to the database is not yet implemented.
    // For now, let the user know and close the dialog so they can copy the content.
    toast({
      title: "Save coming soon",
      description: "You can copy this report for now. Saving reports will be enabled in a future update.",
    });

    onReportSaved?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Generate Vendor Report
            {transactionData && (
              <span className="block text-sm font-normal text-muted-foreground mt-1">
                {transactionData.address}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {!generatedReport ? (
            <ReportForm
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              initialData={formData}
            />
          ) : (
            <ReportOutput
              report={generatedReport}
              onSave={handleSave}
              onRegenerate={handleRegenerateSection}
              isSaved={!!currentReportId}
              regeneratingSection={regeneratingSection}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
