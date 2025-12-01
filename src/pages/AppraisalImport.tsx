import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, FileText, AlertTriangle } from 'lucide-react';
import { useLoggedAppraisals } from '@/hooks/useLoggedAppraisals';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ParsedRow {
  Name: string;
  Mobile?: string;
  Email?: string;
  Address: string;
  Suburb?: string;
  'Date of MAP'?: string;
  Status?: string;
}

interface PreviewData {
  totalRows: number;
  duplicates: string[];
  preview: ParsedRow[];
  allRows: ParsedRow[];
}

export default function AppraisalImport() {
  const navigate = useNavigate();
  const { addAppraisal, appraisals } = useLoggedAppraisals();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{success: number; failed: number; errors: string[]; skipped: number}>({
    success: 0,
    failed: 0,
    errors: [],
    skipped: 0
  });

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    try {
      // Handle format like "Nov 22, 2025"
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return data;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = parseCSV(text) as ParsedRow[];

      // Check for duplicates against existing appraisals
      const existingAddresses = new Set(
        appraisals.map(a => a.address.toLowerCase().trim())
      );
      
      const duplicates = data
        .filter(row => row.Address && existingAddresses.has(row.Address.toLowerCase().trim()))
        .map(row => row.Address);

      setPreviewData({
        totalRows: data.length,
        duplicates,
        preview: data.slice(0, 5),
        allRows: data
      });
    } catch (error) {
      toast.error('Failed to process CSV file');
      console.error(error);
    }
    
    // Reset the input
    event.target.value = '';
  };

  const handleStartImport = async () => {
    if (!previewData) return;

    setIsProcessing(true);
    setResults({ success: 0, failed: 0, errors: [], skipped: 0 });
    setProgress(0);

    // Start import in background
    const importPromise = processImport();
    
    // Show toast that import has started
    toast.info('Import started in background. You can navigate away.');

    try {
      await importPromise;
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const processImport = async () => {
    if (!previewData) return;

    const data = previewData.allRows;
    const existingAddresses = new Set(
      appraisals.map(a => a.address.toLowerCase().trim())
    );

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        const vendorName = row.Name || 'Unknown Vendor';
        const address = row.Address;
        const suburb = row.Suburb;
        const appraisalDate = parseDate(row['Date of MAP']) || new Date().toISOString().split('T')[0];
        const status = row.Status?.toLowerCase() || 'map';

        if (!address) {
          errors.push(`Row ${i + 1} skipped - missing address for ${vendorName}`);
          failedCount++;
          continue;
        }

        // Skip duplicates
        if (existingAddresses.has(address.toLowerCase().trim())) {
          skippedCount++;
          continue;
        }

        await addAppraisal({
          vendor_name: vendorName,
          address: address,
          suburb: suburb || '',
          appraisal_date: appraisalDate,
          warmth: 'warm',
          likelihood: 5,
          status: status as any,
          appraisal_method: 'in_person',
          last_contact: appraisalDate,
          notes: row.Mobile ? `Mobile: ${row.Mobile}${row.Email ? ', Email: ' + row.Email : ''}` : ''
        } as any);

        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`Row ${i + 1} failed: ${error}`);
      }

      // Update progress
      setProgress(((i + 1) / data.length) * 100);
    }

    setResults({ success: successCount, failed: failedCount, errors, skipped: skippedCount });
    setIsProcessing(false);
    
    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} appraisals`);
    }
    if (skippedCount > 0) {
      toast.info(`Skipped ${skippedCount} duplicate addresses`);
    }
    if (failedCount > 0) {
      toast.error(`Failed to import ${failedCount} appraisals`);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/prospect-dashboard/appraisals')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Import Appraisals</h1>
          <p className="text-muted-foreground">Upload a CSV file to bulk import appraisals</p>
        </div>
      </div>

      {!previewData && !isProcessing && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>CSV Format</CardTitle>
            <CardDescription>
              Your CSV file should include the following columns: Name, Mobile, Email, Address, Suburb, Date of MAP, Status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file" className="text-base font-semibold mb-2 block">
                  Select CSV File
                </Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {previewData && !isProcessing && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Import Preview
            </CardTitle>
            <CardDescription>
              Review the summary below before importing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{previewData.totalRows}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-green-600">
                  {previewData.totalRows - previewData.duplicates.length}
                </div>
                <div className="text-sm text-muted-foreground">New Appraisals</div>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-amber-600">
                  {previewData.duplicates.length}
                </div>
                <div className="text-sm text-muted-foreground">Duplicates (Will Skip)</div>
              </div>
            </div>

            {/* Duplicate Warning */}
            {previewData.duplicates.length > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    Duplicate Addresses Found
                  </div>
                  <div className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                    The following addresses already exist and will be skipped:
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {previewData.duplicates.slice(0, 10).map((addr, idx) => (
                      <div key={idx} className="text-sm font-mono text-amber-700 dark:text-amber-300">
                        • {addr}
                      </div>
                    ))}
                    {previewData.duplicates.length > 10 && (
                      <div className="text-sm text-amber-600 dark:text-amber-400 italic">
                        ... and {previewData.duplicates.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div>
              <h4 className="font-semibold mb-3">Preview (First 5 Records)</h4>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Name</th>
                        <th className="px-4 py-2 text-left font-semibold">Address</th>
                        <th className="px-4 py-2 text-left font-semibold">Suburb</th>
                        <th className="px-4 py-2 text-left font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview.map((row, idx) => {
                        const isDuplicate = previewData.duplicates.includes(row.Address);
                        return (
                          <tr key={idx} className={`border-t ${isDuplicate ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                {row.Name || 'Unknown'}
                                {isDuplicate && (
                                  <Badge variant="outline" className="text-xs border-amber-600 text-amber-600">
                                    Duplicate
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2">{row.Address}</td>
                            <td className="px-4 py-2">{row.Suburb || '-'}</td>
                            <td className="px-4 py-2">
                              <Badge variant="secondary">
                                {row.Status || 'MAP'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={handleStartImport} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Start Import ({previewData.totalRows - previewData.duplicates.length} Records)
              </Button>
              <Button variant="outline" onClick={() => setPreviewData(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isProcessing && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Import in Progress</CardTitle>
            <CardDescription>
              Processing your appraisals... You can navigate away and the import will continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4 animate-pulse" />
              <span>Importing records...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {(results.success > 0 || results.failed > 0 || results.skipped > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              {results.success > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">{results.success} successful</span>
                </div>
              )}
              {results.skipped > 0 && (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">{results.skipped} skipped (duplicates)</span>
                </div>
              )}
              {results.failed > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">{results.failed} failed</span>
                </div>
              )}
            </div>

            {results.errors.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-sm">Errors:</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {results.errors.map((error, idx) => (
                    <p key={idx} className="text-sm text-destructive">{error}</p>
                  ))}
                </div>
              </div>
            )}

            {results.success > 0 && (
              <Button onClick={() => navigate('/prospect-dashboard/appraisals')} className="w-full">
                View Imported Appraisals
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
