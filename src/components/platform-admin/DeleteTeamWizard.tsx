import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamDeletion } from '@/hooks/useTeamDeletion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package, ArrowRight, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DeleteTeamWizardProps {
  team: {
    id: string;
    name: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

type DeleteOption = 'orphan' | 'transfer' | 'delete';

export function DeleteTeamWizard({ team, open, onOpenChange, onDeleted }: DeleteTeamWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedOption, setSelectedOption] = useState<DeleteOption>('orphan');
  const [targetTeamId, setTargetTeamId] = useState('');
  const [confirmText, setConfirmText] = useState('');
  
  const {
    dataCounts,
    isLoadingCounts,
    totalDataCount,
    agencyId,
    transferData,
    deleteAllData,
    deleteTeam,
    getOrCreateOrphanTeam,
    isTransferring,
    isDeleting,
  } = useTeamDeletion(team.id, open);

  // Fetch available teams for transfer
  const { data: availableTeams } = useQuery({
    queryKey: ['teams-for-transfer', agencyId, team.id],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('agency_id', agencyId)
        .eq('is_archived', false)
        .eq('is_orphan_team', false)
        .neq('id', team.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open && !!agencyId && step === 2,
  });

  const handleConfirm = async () => {
    try {
      if (totalDataCount > 0) {
        if (selectedOption === 'orphan') {
          const orphanTeamId = await getOrCreateOrphanTeam(agencyId!);
          await transferData({ targetTeamId: orphanTeamId });
        } else if (selectedOption === 'transfer') {
          await transferData({ targetTeamId });
        } else if (selectedOption === 'delete') {
          await deleteAllData();
        }
      }
      
      await deleteTeam();
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedOption('orphan');
    setTargetTeamId('');
    setConfirmText('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetWizard();
    onOpenChange(isOpen);
  };

  const isProcessing = isTransferring || isDeleting;
  const canProceedStep2 = selectedOption === 'orphan' || 
    selectedOption === 'delete' || 
    (selectedOption === 'transfer' && targetTeamId);
  const canConfirmDelete = selectedOption !== 'delete' || confirmText === team.name;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Team: {team.name}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Review the data associated with this team'}
            {step === 2 && 'Choose how to handle the team data'}
            {step === 3 && 'Confirm deletion'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Data Summary */}
        {step === 1 && (
          <div className="space-y-4">
            {isLoadingCounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {totalDataCount > 0 ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This team has associated data that needs to be handled before deletion.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      This team has no associated data and can be safely deleted.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {dataCounts && Object.entries(dataCounts)
                    .filter(([key, value]) => key !== 'teamMembers' && value > 0)
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between p-2 bg-muted/50 rounded">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                </div>

                {dataCounts?.teamMembers ? (
                  <p className="text-sm text-muted-foreground">
                    <strong>{dataCounts.teamMembers}</strong> team members will become solo agents.
                  </p>
                ) : null}
              </>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep(totalDataCount > 0 ? 2 : 3)}>
                {totalDataCount > 0 ? 'Next' : 'Delete Team'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Action */}
        {step === 2 && (
          <div className="space-y-4">
            <RadioGroup value={selectedOption} onValueChange={(v) => setSelectedOption(v as DeleteOption)}>
              <div className="space-y-3">
                <label
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedOption === 'orphan' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="orphan" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Package className="h-4 w-4 text-amber-500" />
                      Move to Orphan Data
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Preserve all historical data in a special "Orphan Data" section. Data can be reassigned later.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedOption === 'transfer' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="transfer" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <ArrowRight className="h-4 w-4 text-blue-500" />
                      Transfer to Another Team
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Move all data to an existing team in this office.
                    </p>
                    {selectedOption === 'transfer' && (
                      <div className="mt-2">
                        <Select value={targetTeamId} onValueChange={setTargetTeamId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select destination team..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTeams?.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                            {availableTeams?.length === 0 && (
                              <div className="px-2 py-1 text-sm text-muted-foreground">
                                No other teams available
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedOption === 'delete' ? 'border-destructive bg-destructive/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="delete" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Delete Everything
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Permanently delete all associated data. This cannot be undone.
                    </p>
                  </div>
                </label>
              </div>
            </RadioGroup>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Summary</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Team "{team.name}" will be permanently deleted</li>
                <li>• {dataCounts?.teamMembers || 0} members will become solo agents</li>
                {totalDataCount > 0 && (
                  <li>
                    • {totalDataCount} records will be{' '}
                    {selectedOption === 'orphan' && 'moved to Orphan Data'}
                    {selectedOption === 'transfer' && `transferred to ${availableTeams?.find(t => t.id === targetTeamId)?.name}`}
                    {selectedOption === 'delete' && <span className="text-destructive font-medium">permanently deleted</span>}
                  </li>
                )}
              </ul>
            </div>

            {selectedOption === 'delete' && totalDataCount > 0 && (
              <div className="space-y-2">
                <Label>Type "{team.name}" to confirm deletion:</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={team.name}
                />
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(totalDataCount > 0 ? 2 : 1)} disabled={isProcessing}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isProcessing || !canConfirmDelete}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Team
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
