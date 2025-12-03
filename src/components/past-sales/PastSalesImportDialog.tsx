import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Upload, FileText, AlertTriangle, Loader2, Sheet, Link, HelpCircle, ExternalLink, Download } from 'lucide-react';
import { usePastSalesImport } from '@/hooks/usePastSalesImport';
import { useGoogleSheetsImport } from '@/hooks/useGoogleSheetsImport';
import { FileUploadArea } from '@/components/feedback/FileUploadArea';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PastSalesImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  onImportComplete: () => void;
}

export const PastSalesImportDialog = ({
  open,
  onOpenChange,
  teamId,
  onImportComplete
}: PastSalesImportDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [validatedRows, setValidatedRows] = useState<any[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [summary, setSummary] = useState<any>(null);
  const [parsing, setParsing] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [importMethod, setImportMethod] = useState<'csv' | 'sheets'>('csv');

  const { parseCSV, parseGoogleSheetData, importPastSales, isImporting, progress } = usePastSalesImport();
  const { fetchGoogleSheet, isFetching } = useGoogleSheetsImport();
  const { toast } = useToast();

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    
    const selectedFile = files[0];
    setFile(selectedFile);
    setParsing(true);

    try {
      const results = await parseCSV(selectedFile);
      setValidatedRows(results);
      setParsing(false);
      setStep('preview');
      
      toast({
        title: "CSV parsed successfully",
        description: `Found ${results.length} records to review`,
      });
    } catch (error) {
      console.error('Parse error:', error);
      setParsing(false);
      toast({
        title: "Failed to parse CSV",
        description: error instanceof Error ? error.message : "Please check your file format and try again",
        variant: "destructive",
      });
      setFile(null);
    }
  };

  const handleGoogleSheetFetch = async () => {
    if (!googleSheetUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a Google Sheets URL",
        variant: "destructive",
      });
      return;
    }

    setParsing(true);

    try {
      const sheetData = await fetchGoogleSheet(googleSheetUrl);
      const results = parseGoogleSheetData(sheetData);
      setValidatedRows(results);
      setParsing(false);
      setStep('preview');
      
      toast({
        title: "Google Sheet parsed successfully",
        description: `Found ${results.length} records to review`,
      });
    } catch (error) {
      console.error('Google Sheets fetch error:', error);
      setParsing(false);
      toast({
        title: "Failed to fetch Google Sheet",
        description: error instanceof Error ? error.message : "Please check the URL and sharing settings",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    setStep('importing');
    const importSummary = await importPastSales(validatedRows, teamId);
    setSummary(importSummary);
    setStep('complete');
  };

  const handleClose = () => {
    setFile(null);
    setValidatedRows([]);
    setStep('upload');
    setSummary(null);
    setParsing(false);
    setGoogleSheetUrl('');
    setImportMethod('csv');
    onOpenChange(false);
    if (step === 'complete') {
      onImportComplete();
    }
  };

  const validCount = validatedRows.filter(r => r.valid).length;
  const errorCount = validatedRows.filter(r => !r.valid).length;
  const warningCount = validatedRows.filter(r => r.valid && r.warnings.length > 0).length;

  const downloadTemplate = () => {
    const headers = [
      'listing_address',
      'suburb',
      'status',
      'appraisal_value_low',
      'appraisal_value_high',
      'listing_price',
      'sale_value',
      'first_contact_date',
      'appraisal_date',
      'listing_signed_date',
      'listing_live_date',
      'unconditional_date',
      'settlement_date',
      'lost_date',
      'lost_reason',
      'vendor_name',
      'vendor_email',
      'vendor_phone',
      'vendor_moved_to',
      'vendor_referral_partner',
      'buyer_name',
      'buyer_email',
      'buyer_phone',
      'buyer_referral_partner',
      'lead_source'
    ].join(',');

    // Example for SOLD property - quote addresses containing commas
    const soldExample = [
      '"26 Milan Drive, Glen Eden"',
      'Glen Eden',
      'sold',
      '1100000',
      '1250000',
      '1200000',
      '1180000',
      '2023-11-20',
      '2023-12-01',
      '2024-01-10',
      '2024-01-15',
      '2024-02-10',
      '2024-03-01',
      '',
      '',
      'John Smith',
      'john@email.com',
      '021 123 4567',
      'Moved to Titirangi',
      'Yes',
      'Sarah Johnson',
      'sarah@email.com',
      '021 987 6543',
      'No',
      'referral'
    ].join(',');

    // Example for LOST/WITHDRAWN property - quote addresses containing commas
    const lostExample = [
      '"42 Beach Road, Piha"',
      'Piha',
      'withdrawn',
      '900000',
      '1000000',
      '',
      '',
      '2023-10-15',
      '2023-10-25',
      '',
      '',
      '',
      '',
      '2023-11-15',
      'Changed mind - decided to stay',
      'Jane Doe',
      'jane@email.com',
      '021 555 1234',
      '',
      'No',
      '',
      '',
      '',
      '',
      'open home'
    ].join(',');

    const csv = `${headers}\n${soldExample}\n${lostExample}\n\n# Status: 'sold' or 'withdrawn'\n# For SOLD: sale_value, listing_live_date, unconditional_date, settlement_date are required\n# For WITHDRAWN/LOST: only address and status are required`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'past_sales_template.csv';
    a.click();
  };

  const openInGoogleSheets = () => {
    downloadTemplate();
    window.open('https://docs.google.com/spreadsheets/create', '_blank');
    toast({
      title: "Template Downloaded",
      description: "In Google Sheets, go to File → Import → Upload to import your template",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Past Sales</DialogTitle>
          <DialogDescription>
            Upload a CSV file or import directly from Google Sheets
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            {parsing || isFetching ? (
              <div className="py-8 space-y-4">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                  <div className="text-lg font-semibold">
                    {isFetching ? 'Fetching Google Sheet...' : 'Parsing data...'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Validating records and checking for errors
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Tabs value={importMethod} onValueChange={(v) => setImportMethod(v as 'csv' | 'sheets')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="csv" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Upload CSV
                    </TabsTrigger>
                    <TabsTrigger value="sheets" className="gap-2">
                      <Sheet className="h-4 w-4" />
                      Google Sheets
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="csv" className="space-y-4 mt-4">
                    <FileUploadArea
                      files={file ? [file] : []}
                      setFiles={(files) => handleFileSelect(files)}
                      maxFiles={1}
                      accept=".csv,text/csv,application/csv,text/plain"
                      maxSize={10 * 1024 * 1024}
                      label="Drop CSV file here or click to upload"
                      description="CSV file up to 10MB"
                    />

                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription className="space-y-3">
                        <p>Need a template?</p>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                            <Download className="h-4 w-4" />
                            Download CSV
                          </Button>
                          <Button variant="outline" size="sm" onClick={openInGoogleSheets} className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Open in Google Sheets
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Tip: Download template, then import it into a new Google Sheet for collaborative editing.
                        </p>
                      </AlertDescription>
                    </Alert>
                  </TabsContent>

                  <TabsContent value="sheets" className="space-y-4 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Google Sheets URL</label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>The sheet must be shared as "Anyone with the link can view".</p>
                              <p className="mt-1">In Google Sheets: Share → Change to "Anyone with the link" → Viewer</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            value={googleSheetUrl}
                            onChange={(e) => setGoogleSheetUrl(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Button onClick={handleGoogleSheetFetch} disabled={!googleSheetUrl.trim()}>
                          Fetch & Validate
                        </Button>
                      </div>

                      <Alert>
                        <Sheet className="h-4 w-4" />
                        <AlertDescription className="space-y-3">
                          <p>Your Google Sheet should have:</p>
                          <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                            <li>Headers in the first row (same as CSV template)</li>
                            <li>Public sharing enabled ("Anyone with the link")</li>
                          </ul>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                              <Download className="h-4 w-4" />
                              Download CSV
                            </Button>
                            <Button variant="outline" size="sm" onClick={openInGoogleSheets} className="gap-2">
                              <ExternalLink className="h-4 w-4" />
                              Open in Google Sheets
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription>
                  <div className="font-semibold">{validCount} Valid</div>
                  <div className="text-sm text-muted-foreground">Ready to import</div>
                </AlertDescription>
              </Alert>

              {warningCount > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertDescription>
                    <div className="font-semibold">{warningCount} Warnings</div>
                    <div className="text-sm text-muted-foreground">Can still import</div>
                  </AlertDescription>
                </Alert>
              )}

              {errorCount > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold">{errorCount} Errors</div>
                    <div className="text-sm">Will be skipped</div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <ScrollArea className="h-[400px] rounded-md border">
              <div className="p-4 space-y-2">
                {validatedRows.map((row, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      !row.valid
                        ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50'
                        : row.warnings.length > 0
                        ? 'border-warning bg-warning/10'
                        : 'border-border bg-background'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{row.data.address || 'No address'}</div>
                        <div className="text-sm text-muted-foreground">
                          {row.data.suburb && `${row.data.suburb} • `}
                          {row.data.sale_price && `$${row.data.sale_price.toLocaleString()}`}
                        </div>
                      </div>
                      {!row.valid ? (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      ) : row.warnings.length > 0 ? (
                        <AlertTriangle className="h-5 w-5 text-warning" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      )}
                    </div>
                    {row.errors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {row.errors.map((error: string, i: number) => (
                          <div key={i} className="text-sm text-destructive">
                            • {error}
                          </div>
                        ))}
                      </div>
                    )}
                    {row.warnings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {row.warnings.map((warning: string, i: number) => (
                          <div key={i} className="text-sm text-warning">
                            • {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                Import {validCount} Valid Records
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <div className="text-lg font-semibold mb-2">Importing Past Sales...</div>
              <Progress value={progress} className="w-full" />
              <div className="text-sm text-muted-foreground mt-2">{progress}% complete</div>
            </div>
            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <div>✓ Creating records...</div>
              <div>⏳ Geocoding addresses...</div>
            </div>
          </div>
        )}

        {step === 'complete' && summary && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>
                <div className="text-lg font-semibold">Import Complete! ✅</div>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-2xl font-bold text-success">{summary.successful}</div>
                <div className="text-sm text-muted-foreground">Successfully imported</div>
              </div>
              {summary.failed > 0 && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-2xl font-bold text-destructive">{summary.failed}</div>
                  <div className="text-sm text-muted-foreground">Skipped (errors)</div>
                </div>
              )}
              {summary.warnings > 0 && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-2xl font-bold text-warning">{summary.warnings}</div>
                  <div className="text-sm text-muted-foreground">With warnings</div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
