import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CSVUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelected: (file: File) => void;
  isParsing: boolean;
}

export function CSVUploadDialog({ open, onOpenChange, onFileSelected, isParsing }: CSVUploadDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      onFileSelected(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  const downloadTemplate = () => {
    const template = `first_name,last_name,email,mobile,office_name,team_name,role
John,Smith,john.smith@example.com,027 321 3749,Mid City Realty,Team Alpha,salesperson
Jane,Doe,jane.doe@example.com,+64 27 987 6543,Mid City Realty,,team_leader
Bob,Jones,bob.jones@example.com,0275555555,Mid City Realty,Team Beta,assistant`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Users from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to invite multiple users at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Need a template? Download our CSV template to get started.</span>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </AlertDescription>
          </Alert>

          {/* Format Guide */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Required CSV Columns:</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <div><code className="text-xs bg-muted px-1 py-0.5 rounded">first_name</code> - Required</div>
                <div><code className="text-xs bg-muted px-1 py-0.5 rounded">last_name</code> - Required</div>
                <div><code className="text-xs bg-muted px-1 py-0.5 rounded">email</code> - Required</div>
                <div><code className="text-xs bg-muted px-1 py-0.5 rounded">mobile</code> - Optional</div>
                <div><code className="text-xs bg-muted px-1 py-0.5 rounded">office_name</code> - Required</div>
                <div><code className="text-xs bg-muted px-1 py-0.5 rounded">team_name</code> - Optional</div>
                <div><code className="text-xs bg-muted px-1 py-0.5 rounded">role</code> - Required</div>
              </div>
              <Alert className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Valid roles:</strong> team_leader, salesperson, assistant<br />
                  <strong>Mobile formats:</strong> 027 321 3749, +64 27 321 3749, 0273213749
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Upload Area */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
              isParsing && 'opacity-50 pointer-events-none'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-2">
              {isParsing ? 'Parsing CSV...' : 'Drag and drop your CSV file here'}
            </p>
            <p className="text-xs text-muted-foreground mb-4">or</p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
