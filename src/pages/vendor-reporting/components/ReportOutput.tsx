import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Copy, Save, Check, RefreshCw, Loader2, FileText, CheckSquare, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { GeneratedReport } from '../VendorReporting';

interface ReportOutputProps {
  report: GeneratedReport;
  onSave: (report: GeneratedReport) => void;
  onRegenerate: (section: 'vendor' | 'actions' | 'whatsapp', customInstructions?: string) => Promise<void>;
  isSaved: boolean;
  regeneratingSection: 'vendor' | 'actions' | 'whatsapp' | null;
}

const ReportOutput = ({ report, onSave, onRegenerate, isSaved, regeneratingSection }: ReportOutputProps) => {
  const [editedReport, setEditedReport] = useState(report);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [customPrompts, setCustomPrompts] = useState({
    vendor: '',
    actions: '',
    whatsapp: ''
  });

  // Clear prompts after regeneration completes
  useEffect(() => {
    if (regeneratingSection === null) {
      setCustomPrompts({
        vendor: '',
        actions: '',
        whatsapp: ''
      });
    }
  }, [regeneratingSection]);

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleSave = () => {
    onSave(editedReport);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Reports</CardTitle>
        <CardDescription>
          Edit any section, copy to clipboard, or regenerate individual sections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Vendor Report */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Vendor Report
            </h3>
            <Textarea
              value={editedReport.vendorReport}
              onChange={(e) => setEditedReport({ ...editedReport, vendorReport: e.target.value })}
              rows={25}
              disabled={regeneratingSection === 'vendor'}
              className={`font-mono text-xs ${regeneratingSection === 'vendor' ? 'opacity-50' : ''}`}
            />
            <Input
              placeholder="Optional: Add specific instructions (e.g., 'Make it more concise' or 'Emphasize price feedback')"
              value={customPrompts.vendor}
              onChange={(e) => setCustomPrompts({ ...customPrompts, vendor: e.target.value })}
              disabled={regeneratingSection !== null}
              className="text-xs"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onRegenerate('vendor', customPrompts.vendor)}
                disabled={regeneratingSection !== null}
                className="flex-1"
              >
                {regeneratingSection === 'vendor' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(editedReport.vendorReport, 'vendor')}
              >
                {copiedSection === 'vendor' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Column 2: Action Points */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-lg">
              <CheckSquare className="h-5 w-5 text-primary" />
              Action Points
            </h3>
            <Textarea
              value={editedReport.actionPoints}
              onChange={(e) => setEditedReport({ ...editedReport, actionPoints: e.target.value })}
              rows={25}
              disabled={regeneratingSection === 'actions'}
              className={`font-mono text-xs ${regeneratingSection === 'actions' ? 'opacity-50' : ''}`}
            />
            <Input
              placeholder="Optional: Add specific instructions (e.g., 'Make these shorter' or 'Add more buyer names')"
              value={customPrompts.actions}
              onChange={(e) => setCustomPrompts({ ...customPrompts, actions: e.target.value })}
              disabled={regeneratingSection !== null}
              className="text-xs"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onRegenerate('actions', customPrompts.actions)}
                disabled={regeneratingSection !== null}
                className="flex-1"
              >
                {regeneratingSection === 'actions' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(editedReport.actionPoints, 'actions')}
              >
                {copiedSection === 'actions' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Column 3: WhatsApp Summary */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              WhatsApp Summary
            </h3>
            <Textarea
              value={editedReport.whatsappSummary}
              onChange={(e) => setEditedReport({ ...editedReport, whatsappSummary: e.target.value })}
              rows={25}
              disabled={regeneratingSection === 'whatsapp'}
              className={`font-mono text-xs ${regeneratingSection === 'whatsapp' ? 'opacity-50' : ''}`}
            />
            <Input
              placeholder="Optional: Add specific instructions (e.g., 'Make it more casual' or 'Keep under 3 sentences')"
              value={customPrompts.whatsapp}
              onChange={(e) => setCustomPrompts({ ...customPrompts, whatsapp: e.target.value })}
              disabled={regeneratingSection !== null}
              className="text-xs"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onRegenerate('whatsapp', customPrompts.whatsapp)}
                disabled={regeneratingSection !== null}
                className="flex-1"
              >
                {regeneratingSection === 'whatsapp' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(editedReport.whatsappSummary, 'whatsapp')}
              >
                {copiedSection === 'whatsapp' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Save button at bottom */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {isSaved ? 'Update Report' : 'Save Report'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportOutput;
