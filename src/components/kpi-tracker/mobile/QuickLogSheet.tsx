import { useState } from 'react';
import { Drawer } from 'vaul';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateCCH } from '@/lib/cchCalculations';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

interface QuickLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { calls: number; appraisals: number; openHomes: number }) => Promise<void>;
}

export function QuickLogSheet({ open, onOpenChange, onSave }: QuickLogSheetProps) {
  const [calls, setCalls] = useState('');
  const [appraisals, setAppraisals] = useState('');
  const [openHomes, setOpenHomes] = useState('');
  const [saving, setSaving] = useState(false);

  const cch = calculateCCH(
    Number(calls) || 0,
    Number(appraisals) || 0,
    Number(openHomes) || 0
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        calls: Number(calls) || 0,
        appraisals: Number(appraisals) || 0,
        openHomes: Number(openHomes) || 0,
      });
      
      // Reset form
      setCalls('');
      setAppraisals('');
      setOpenHomes('');
      onOpenChange(false);
      toast.success('Day logged successfully!');
    } catch (error) {
      toast.error('Failed to log day');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="bg-background flex flex-col rounded-t-[10px] h-[80%] mt-24 fixed bottom-0 left-0 right-0 z-50">
          <div className="p-4 bg-background rounded-t-[10px] flex-1 overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-8" />
            
            {/* CCH Display - Sticky at top */}
            <div className="sticky top-0 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg p-6 mb-6 text-center">
              <div className="text-sm text-muted-foreground mb-2">Total CCH</div>
              <div className="text-5xl font-bold text-purple-600 dark:text-purple-400">
                {cch.total.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">hours</div>
            </div>

            {/* Input Fields - Large touch targets */}
            <div className="space-y-6">
              <div>
                <Label htmlFor="calls" className="text-base mb-2 block">
                  Prospecting Calls
                </Label>
                <Input
                  id="calls"
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={calls}
                  onChange={(e) => setCalls(e.target.value)}
                  className="text-2xl h-16 text-center"
                />
              </div>

              <div>
                <Label htmlFor="appraisals" className="text-base mb-2 block">
                  Appraisals
                </Label>
                <Input
                  id="appraisals"
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={appraisals}
                  onChange={(e) => setAppraisals(e.target.value)}
                  className="text-2xl h-16 text-center"
                />
              </div>

              <div>
                <Label htmlFor="openHomes" className="text-base mb-2 block">
                  Open Homes
                </Label>
                <Input
                  id="openHomes"
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={openHomes}
                  onChange={(e) => setOpenHomes(e.target.value)}
                  className="text-2xl h-16 text-center"
                />
              </div>
            </div>

            {/* Save Button - Large and prominent */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-14 text-lg mt-8"
              size="lg"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Save Log'}
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
