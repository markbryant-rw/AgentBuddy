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
import { useAppraisalsImport } from '@/hooks/useAppraisalsImport';
import { useGoogleSheetsImport } from '@/hooks/useGoogleSheetsImport';
import { FileUploadArea } from '@/components/feedback/FileUploadArea';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AppraisalsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  onImportComplete: () => void;
}

export const AppraisalsImportDialog = ({
  open,
  onOpenChange,
  teamId,
  onImportComplete
}: AppraisalsImportDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [validatedRows, setValidatedRows] = useState<any[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [summary, setSummary] = useState<any>(null);
  const [parsing, setParsing] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [importMethod, setImportMethod] = useState<'csv' | 'sheets'>('csv');
  const [filterMode, setFilterMode] = useState<'all' | 'warnings' | 'errors'>('all');

  const { parseCSV, parseGoogleSheetData, importAppraisals, isImporting, progress } = useAppraisalsImport();
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
    const importSummary = await importAppraisals(validatedRows, teamId);
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
    setFilterMode('all');
    onOpenChange(false);
    if (step === 'complete') {
      onImportComplete();
    }
  };

  const validCount = validatedRows.filter(r => r.valid).length;
  const errorCount = validatedRows.filter(r => !r.valid).length;
  const warningCount = validatedRows.filter(r => r.valid && r.warnings.length > 0).length;

  const filteredRows = validatedRows.filter(row => {
    if (filterMode === 'warnings') return row.valid && row.warnings.length > 0;
    if (filterMode === 'errors') return !row.valid;
    return true;
  });

  const downloadTemplate = () => {
    const headers = [
      'address',
      'suburb',
      'vendor_name',
      'vendor_mobile',
      'vendor_email',
      'appraisal_date',
      'estimated_value',
      'lead_source',
      'stage',
      'outcome',
      'intent',
      'last_contact',
      'next_follow_up',
      'notes'
    ].join(',');

    const example1 = [
      '"123 Main Street, Ponsonby"',
      'Ponsonby',
      'John Smith',
      '021 123 4567',
      'john@example.com',
      '2024-01-15',
      '1175000',
      'referral',
      'MAP',
      'In Progress',
      'high',
      '2024-01-15',
      '2024-02-15',
      'Interested in spring listing'
    ].join(',');

    const example2 = [
      '"45 Beach Road, Piha"',
      'Piha',
      'Jane Doe',
      '',
      '',
      '2024-01-20',
      '850000',
      'open_home',
      'VAP',
      'In Progress',
      'medium',
      '',
      '2024-03-01',
      'Follow up after Easter'
    ].join(',');

    const csv = `${headers}\n${example1}\n${example2}\n\n# Required: address, appraisal_date\n# Stage options: VAP, MAP, LAP\n# Outcome options: In Progress, WON, LOST\n# Intent options: low, medium, high`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appraisals_template.csv';
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
          <DialogTitle>Import Appraisals</DialogTitle>
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
                <Alert 
                  className={`cursor-pointer transition-all ${filterMode === 'warnings' ? 'ring-2 ring-warning' : 'hover:bg-warning/5'}`}
                  onClick={() => setFilterMode(filterMode === 'warnings' ? 'all' : 'warnings')}
                >
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertDescription>
                    <div className="font-semibold">{warningCount} Warnings</div>
                    <div className="text-sm text-muted-foreground">
                      {filterMode === 'warnings' ? 'Click to show all' : 'Click to filter'}
                    </div>
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
                {filteredRows.map((row, index) => (
                  <div
                    key={`${row.data.address || 'no-address'}-${row.data.appraisal_date || ''}-${index}`}
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
                          {row.data.vendor_name && `${row.data.vendor_name} • `}
                          {row.data.appraisal_date}
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

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                Import {validCount} Records
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 space-y-4">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <div className="text-lg font-semibold">Importing appraisals...</div>
              <div className="text-sm text-muted-foreground mt-2">
                This may take a moment
              </div>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="text-center text-sm text-muted-foreground">
              {progress}% complete
            </div>
          </div>
        )}

        {step === 'complete' && summary && (
          <div className="py-8 space-y-6">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-success" />
              <div className="text-2xl font-semibold">Import Complete!</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription>
                  <div className="font-semibold">{summary.successful}</div>
                  <div className="text-sm text-muted-foreground">Imported</div>
                </AlertDescription>
              </Alert>

              {summary.warnings > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertDescription>
                    <div className="font-semibold">{summary.warnings}</div>
                    <div className="text-sm text-muted-foreground">With warnings</div>
                  </AlertDescription>
                </Alert>
              )}

              {summary.failed > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold">{summary.failed}</div>
                    <div className="text-sm">Failed</div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex justify-center">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
