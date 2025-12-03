import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Trash2 } from 'lucide-react';
import { useLoggedAppraisals } from '@/hooks/useLoggedAppraisals';
import { useTeam } from '@/hooks/useTeam';
import AppraisalsList from '@/components/appraisals/AppraisalsList';
import AppraisalDetailDialog from '@/components/appraisals/AppraisalDetailDialog';
import { AppraisalsImportDialog } from '@/components/appraisals/AppraisalsImportDialog';
import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';

const ProspectAppraisals = () => {
  const { appraisals, loading, refreshAppraisals, removeDuplicates } = useLoggedAppraisals();
  const { team } = useTeam();
  const [selectedAppraisal, setSelectedAppraisal] = useState<LoggedAppraisal | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isRemovingDuplicates, setIsRemovingDuplicates] = useState(false);

  const handleAppraisalClick = (appraisal: LoggedAppraisal) => {
    setSelectedAppraisal(appraisal);
    setIsDetailDialogOpen(true);
  };

  const handleAddAppraisal = () => {
    setSelectedAppraisal(null);
    setIsDetailDialogOpen(true);
    setIsAddDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDetailDialogOpen(false);
    setIsAddDialogOpen(false);
    setSelectedAppraisal(null);
  };

  const handleImportComplete = () => {
    refreshAppraisals();
  };

  const handleRemoveDuplicates = async () => {
    setIsRemovingDuplicates(true);
    await removeDuplicates();
    setIsRemovingDuplicates(false);
  };

  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="prospect" currentPage="Appraisals" />
      <div className="flex-1 overflow-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Appraisals</h1>
              <p className="text-muted-foreground mt-1">
                Manage all appraisals, track warmth, and plan follow-ups
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleRemoveDuplicates} 
                variant="outline"
                disabled={isRemovingDuplicates}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isRemovingDuplicates ? 'Removing...' : 'Remove Duplicates'}
              </Button>
              <Button onClick={handleAddAppraisal} variant="secondary">
                <Plus className="h-4 w-4 mr-2" />
                Log Appraisal
              </Button>
              <Button onClick={() => setIsImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </div>

          {/* Appraisals List */}
          <AppraisalsList 
            appraisals={appraisals}
            loading={loading}
            onAppraisalClick={handleAppraisalClick}
          />

          {/* Detail Dialog */}
          <AppraisalDetailDialog
            appraisal={selectedAppraisal}
            open={isDetailDialogOpen}
            onOpenChange={handleDialogClose}
            isNew={isAddDialogOpen}
          />

          {/* Import Dialog */}
          {team && (
            <AppraisalsImportDialog
              open={isImportDialogOpen}
              onOpenChange={setIsImportDialogOpen}
              teamId={team.id}
              onImportComplete={handleImportComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProspectAppraisals;
