import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReportForm from './components/ReportForm';
import ReportOutput from './components/ReportOutput';
import { Button } from '@/components/ui/button';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';

export interface GeneratedReport {
  vendorReport: string;
  actionPoints: string;
  whatsappSummary: string;
}

const VendorReporting = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transactionId');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<'vendor' | 'actions' | 'whatsapp' | null>(null);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    transactionId: transactionId || '',
    propertyAddress: '',
    vendorName: '',
    campaignWeek: 1,
    desiredOutcome: '',
    buyerFeedback: '',
    useEmojiFormatting: true
  });

  // Fetch transaction data if transactionId is present
  const { data: transactionData } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: async () => {
      if (!transactionId) return null;
      const { data, error } = await supabase
        .from('transactions')
        .select('id, address, suburb, vendor_names, live_date')
        .eq('id', transactionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!transactionId,
  });

  // Calculate campaign week based on live_date
  const calculateCampaignWeek = (liveDate: string | null): number | null => {
    if (!liveDate) return null;
    const live = new Date(liveDate);
    const today = new Date();
    const diffMs = today.getTime() - live.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.ceil(diffDays / 7);
    return Math.max(1, diffWeeks);
  };

  // Pre-fill form when transaction data loads
  useEffect(() => {
    if (transactionData) {
      const vendorNames = transactionData.vendor_names;
      const vendorName = Array.isArray(vendorNames)
        ? vendorNames
            .map((v: any) => v.full_name || `${v.first_name || ''} ${v.last_name || ''}`.trim())
            .filter((name: string) => name.length > 0)
            .join(' & ')
        : '';

      const campaignWeek = calculateCampaignWeek(transactionData.live_date);
      
      const propertyAddress = transactionData.suburb
        ? `${transactionData.address}, ${transactionData.suburb}`
        : transactionData.address;

      setFormData(prev => ({
        ...prev,
        transactionId: transactionData.id,
        propertyAddress,
        vendorName: vendorName,
        campaignWeek: campaignWeek || 1,
      }));
    }
  }, [transactionData]);

  // Clean up old reports on mount
  useEffect(() => {
    const cleanupOldReports = async () => {
      try {
        const { error } = await supabase.rpc('delete_old_vendor_reports');
        if (error) {
          console.error('Error cleaning up old reports:', error);
        }
      } catch (err) {
        console.error('Error calling cleanup function:', err);
      }
    };

    cleanupOldReports();
  }, []);

  const handleGenerate = async (data: typeof formData) => {
    setIsGenerating(true);
    setFormData(data);

    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'generate-vendor-report',
        {
          body: {
            propertyAddress: data.propertyAddress,
            vendorName: data.vendorName,
          campaignWeek: data.campaignWeek,
          desiredOutcome: data.desiredOutcome,
          buyerFeedback: data.buyerFeedback,
          useEmojiFormatting: data.useEmojiFormatting,
          section: 'all'
        }
      }
    );

      if (functionError) {
        throw functionError;
      }

      if (!functionData.success) {
        throw new Error(functionData.error || 'Failed to generate report');
      }

      setGeneratedReport(functionData.report);
      setCurrentReportId(null);
      toast.success('Report generated successfully!');
    } catch (error: any) {
      console.error('Error generating report:', error);
      
      if (error.message?.includes('429')) {
        toast.error('Rate limit exceeded. Please try again in a few moments.');
      } else if (error.message?.includes('402')) {
        toast.error('AI credits exhausted. Please add credits to your workspace.');
      } else {
        toast.error(error.message || 'Failed to generate report');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSection = async (section: 'vendor' | 'actions' | 'whatsapp', customInstructions?: string) => {
    if (!generatedReport) return;
    
    setRegeneratingSection(section);
    
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'generate-vendor-report',
        {
          body: {
            propertyAddress: formData.propertyAddress,
            vendorName: formData.vendorName,
          campaignWeek: formData.campaignWeek,
          desiredOutcome: formData.desiredOutcome,
          buyerFeedback: formData.buyerFeedback,
          useEmojiFormatting: formData.useEmojiFormatting,
          section: section,
          customInstructions: customInstructions
        }
      }
    );
      
      if (functionError) throw functionError;
      if (!functionData.success) throw new Error(functionData.error);
      
      // Merge regenerated section with existing report
      const sectionKey = 
        section === 'vendor' ? 'vendorReport' : 
        section === 'actions' ? 'actionPoints' : 
        'whatsappSummary';
      
      setGeneratedReport({
        ...generatedReport,
        [sectionKey]: functionData.report[sectionKey]
      });
      
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} section regenerated successfully!`);
    } catch (error: any) {
      console.error('Error regenerating section:', error);
      
      if (error.message?.includes('429')) {
        toast.error('Rate limit exceeded. Please try again in a moment.');
      } else if (error.message?.includes('402')) {
        toast.error('AI credits exhausted. Please add credits.');
      } else {
        toast.error(`Failed to regenerate ${section} section`);
      }
    } finally {
      setRegeneratingSection(null);
    }
  };

  const handleSave = async (editedReport: GeneratedReport) => {
    if (!user) {
      toast.error('You must be logged in to save reports');
      return;
    }

    try {
      if (currentReportId) {
        // Update existing report
        const { error } = await supabase
          .from('vendor_reports')
          .update({
            generated_report: editedReport as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentReportId);

        if (error) throw error;
        toast.success('Report updated successfully!');
      } else {
        // Insert new report
        // Get property address from transaction
        const { data: transaction } = await supabase
          .from('transactions')
          .select('address, suburb')
          .eq('id', formData.transactionId)
          .single();

        const propertyAddress = transaction 
          ? (transaction.suburb ? `${transaction.address}, ${transaction.suburb}` : transaction.address)
          : '';

        const { error } = await supabase
          .from('vendor_reports')
          .insert({
            team_id: team?.id || null,
            created_by: user.id,
            transaction_id: formData.transactionId || null,
            property_address: propertyAddress,
            vendor_name: formData.vendorName || null,
            campaign_week: formData.campaignWeek,
            desired_outcome: formData.desiredOutcome,
            buyer_feedback: formData.buyerFeedback,
            generated_report: editedReport as any
          });

        if (error) throw error;
        toast.success('Report saved successfully!');
        setCurrentReportId(null);
      }
    } catch (error: any) {
      console.error('Error saving report:', error);
      toast.error(error.message || 'Failed to save report');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="transact" currentPage="Vendor Reporting" />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-8 space-y-8">
          {/* Header Zone */}
          <div className="bg-gradient-to-br from-green-50/30 to-white dark:from-green-900/5 dark:to-background p-6 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <ClipboardList className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Vendor Report Generator</h1>
                <p className="text-muted-foreground mt-1">AI-powered campaign reports</p>
                {transactionData && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Generating report for: <span className="font-semibold">{transactionData.address}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

      {/* Form Card with enhanced styling */}
      <Card className="border-l-4 border-l-green-500 hover:shadow-xl transition-all p-6">
        <ReportForm
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          initialData={formData}
        />
      </Card>

      {generatedReport && (
        <div className="bg-gradient-to-br from-white to-green-50/30 dark:from-background dark:to-green-900/5 p-6 rounded-xl">
          <ReportOutput
            report={generatedReport}
            onSave={handleSave}
            onRegenerate={handleRegenerateSection}
            isSaved={!!currentReportId}
            regeneratingSection={regeneratingSection}
            />
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default VendorReporting;
