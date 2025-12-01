import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReportFormProps {
  onGenerate: (data: {
    transactionId?: string;
    propertyAddress: string;
    vendorName: string;
    campaignWeek: number;
    desiredOutcome: string;
    buyerFeedback: string;
    useEmojiFormatting: boolean;
  }) => void;
  isGenerating: boolean;
  initialData?: {
    transactionId?: string;
    propertyAddress?: string;
    vendorName?: string;
    campaignWeek: number;
    desiredOutcome: string;
    buyerFeedback: string;
    useEmojiFormatting?: boolean;
  };
}

interface LiveTransaction {
  id: string;
  address: string;
  suburb: string;
  vendor_names: Array<{ first_name: string; last_name: string; full_name?: string }>;
  client_name?: any;
  live_date: string | null;
  stage: string;
}

const ReportForm = ({ onGenerate, isGenerating, initialData }: ReportFormProps) => {
  const [transactionId, setTransactionId] = useState(initialData?.transactionId || '');
  const [selectedTransaction, setSelectedTransaction] = useState<LiveTransaction | null>(null);
  const [vendorName, setVendorName] = useState(initialData?.vendorName || '');
  const [campaignWeek, setCampaignWeek] = useState(initialData?.campaignWeek || 1);
  const [desiredOutcome, setDesiredOutcome] = useState(initialData?.desiredOutcome || '');
  const [buyerFeedback, setBuyerFeedback] = useState(initialData?.buyerFeedback || '');
  const [useEmojiFormatting, setUseEmojiFormatting] = useState(initialData?.useEmojiFormatting ?? true);
  const [liveTransactions, setLiveTransactions] = useState<LiveTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  // Load live/under contract transactions
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('id, address, suburb, vendor_names, client_name, live_date, stage')
          .in('stage', ['live', 'contract'])
          .eq('archived', false)
          .order('live_date', { ascending: false });

        if (error) throw error;
        setLiveTransactions((data || []) as LiveTransaction[]);
      } catch (error: any) {
        console.error('Error loading transactions:', error);
        toast.error('Failed to load properties');
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    loadTransactions();
  }, []);

  // Auto-select transaction if initialData has transactionId
  useEffect(() => {
    if (initialData?.transactionId && liveTransactions.length > 0 && !selectedTransaction) {
      const transaction = liveTransactions.find(t => t.id === initialData.transactionId);
      if (transaction) {
        setSelectedTransaction(transaction);
        
        // Auto-fill vendor name from transaction data
        let vendorFullName =
          transaction.vendor_names?.[0]?.full_name ||
          `${transaction.vendor_names?.[0]?.first_name || ''} ${transaction.vendor_names?.[0]?.last_name || ''}`.trim();
        
        if (!vendorFullName && transaction.client_name) {
          try {
            const parsed =
              typeof transaction.client_name === 'string'
                ? JSON.parse(transaction.client_name)
                : transaction.client_name;

            if (parsed && (parsed.first_name || parsed.last_name)) {
              vendorFullName = `${parsed.first_name || ''} ${parsed.last_name || ''}`.trim();
            } else {
              vendorFullName = String(transaction.client_name);
            }
          } catch {
            vendorFullName = String(transaction.client_name);
          }
        }
        
        if (vendorFullName) {
          setVendorName(vendorFullName);
        }
        
        // Auto-calculate campaign week from live_date
        if (transaction.live_date) {
          const liveDate = new Date(transaction.live_date);
          const today = new Date();
          const daysDiff = Math.floor((today.getTime() - liveDate.getTime()) / (1000 * 60 * 60 * 24));
          const calculatedWeek = Math.floor(daysDiff / 7) + 1;
          setCampaignWeek(calculatedWeek > 0 ? calculatedWeek : 1);
        }
      }
    }
  }, [liveTransactions, initialData?.transactionId, selectedTransaction, vendorName, campaignWeek, initialData?.campaignWeek]);

  const handleTransactionSelect = (selectedId: string) => {
    const transaction = liveTransactions.find(t => t.id === selectedId);
    if (!transaction) return;

    setTransactionId(selectedId);
    setSelectedTransaction(transaction);

    // Auto-calculate campaign week from live_date
    if (transaction.live_date) {
      const liveDate = new Date(transaction.live_date);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - liveDate.getTime()) / (1000 * 60 * 60 * 24));
      const calculatedWeek = Math.floor(daysDiff / 7) + 1;
      setCampaignWeek(calculatedWeek > 0 ? calculatedWeek : 1);
    }
  };

  const getPropertyAddress = () => {
    if (selectedTransaction) {
      return selectedTransaction.suburb
        ? `${selectedTransaction.address}, ${selectedTransaction.suburb}`
        : selectedTransaction.address;
    }

    if (initialData?.propertyAddress) {
      return initialData.propertyAddress;
    }

    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const propertyAddress = getPropertyAddress();

    if (!propertyAddress) {
      console.error('Vendor report: propertyAddress is missing');
      toast.error('Please select a property before generating the report.');
      return;
    }

    onGenerate({
      transactionId,
      propertyAddress,
      vendorName,
      campaignWeek,
      desiredOutcome,
      buyerFeedback,
      useEmojiFormatting
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Row: Select Property, Vendor Name, Campaign Week */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Select Property */}
        <div className="space-y-2">
          <Label htmlFor="transaction">Select Property *</Label>
          <Select
            value={transactionId}
            onValueChange={handleTransactionSelect}
            disabled={isGenerating || isLoadingTransactions || !!initialData?.transactionId}
          >
            <SelectTrigger id="transaction">
              <SelectValue placeholder={isLoadingTransactions ? "Loading..." : "Select property..."} />
            </SelectTrigger>
            <SelectContent>
              {liveTransactions.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.address}, {t.suburb} • {t.stage === 'live' ? 'LIVE' : 'CONTRACT'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Vendor Name */}
        <div className="space-y-2">
          <Label htmlFor="vendorName">Vendor Name</Label>
          <Input
            id="vendorName"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="Enter vendor name"
            disabled={isGenerating}
          />
        </div>

        {/* Campaign Week */}
        <div className="space-y-2">
          <Label htmlFor="campaignWeek" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Campaign Week *
          </Label>
          <Input
            id="campaignWeek"
            type="number"
            min="1"
            value={campaignWeek}
            onChange={(e) => setCampaignWeek(parseInt(e.target.value))}
            required
            disabled={isGenerating}
          />
        </div>
      </div>

      {/* Desired Outcome */}
      <div className="space-y-2">
        <Label htmlFor="desiredOutcome">Desired Outcome (Tone & Direction) *</Label>
        <Textarea
          id="desiredOutcome"
          value={desiredOutcome}
          onChange={(e) => setDesiredOutcome(e.target.value)}
          placeholder="e.g., Push for offers, build urgency, gather more feedback, prepare for price discussion..."
          rows={3}
          required
          disabled={isGenerating}
        />
        <p className="text-sm text-muted-foreground">
          Describe how you want the report to sound and what you want to achieve
        </p>
      </div>

      {/* Buyer Feedback */}
      <div className="space-y-2">
        <Label htmlFor="buyerFeedback">Buyer Feedback (Raw from CRM) *</Label>
        <Textarea
          id="buyerFeedback"
          value={buyerFeedback}
          onChange={(e) => setBuyerFeedback(e.target.value)}
          placeholder={`Paste raw buyer feedback here. Example format:

$725,000
1 Public
Not requested
11/10/25 | Price feedback: $725,000
Comments: INSPECTION: Replied C to the SMS. For her it was the driveway maintenance...
Rochelle R.
-
$725,000
1 Public
Not requested
...`}
          rows={12}
          required
          disabled={isGenerating}
          className="font-mono text-sm"
        />
        <p className="text-sm text-muted-foreground">
          Paste raw feedback from your CRM: groups through, price feedback, comments, repeat viewings, etc.
        </p>
      </div>

      {/* Emoji Formatting Toggle */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="emojiFormatting"
          checked={useEmojiFormatting}
          onCheckedChange={(checked) => setUseEmojiFormatting(checked as boolean)}
        />
        <Label htmlFor="emojiFormatting" className="font-normal cursor-pointer">
          Use emoji formatting (⭐📊➡️) for better readability
        </Label>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isGenerating || !transactionId || !buyerFeedback}
        className="w-full md:w-auto"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Report...
          </>
        ) : (
          'Generate Report'
        )}
      </Button>
    </form>
  );
};

export default ReportForm;
