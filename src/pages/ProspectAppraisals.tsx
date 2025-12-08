import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Trash2, FileText, Flame } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { useLoggedAppraisals } from '@/hooks/useLoggedAppraisals';
import { Link } from 'react-router-dom';
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
  const [showHotLeadsOnly, setShowHotLeadsOnly] = useState(false);

  // Filter appraisals for hot leads
  const filteredAppraisals = useMemo(() => {
    if (!showHotLeadsOnly) return appraisals;
    return appraisals.filter(a => 
      a.beacon_is_hot_lead === true || (a.beacon_propensity_score && a.beacon_propensity_score >= 70)
    );
  }, [appraisals, showHotLeadsOnly]);

  const hotLeadsCount = useMemo(() => {
    return appraisals.filter(a => 
      a.beacon_is_hot_lead === true || (a.beacon_propensity_score && a.beacon_propensity_score >= 70)
    ).length;
  }, [appraisals]);

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
              <div className="flex items-center gap-3 mt-1">
                <p className="text-muted-foreground">
                  Manage all appraisals, track warmth, and plan follow-ups
                </p>
                <Link 
                  to="/appraisal-templates" 
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Task Templates
                </Link>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              {/* Hot Leads Toggle */}
              <Toggle
                pressed={showHotLeadsOnly}
                onPressedChange={setShowHotLeadsOnly}
                variant="outline"
                className={`gap-2 ${showHotLeadsOnly ? 'bg-orange-500/10 border-orange-500/50 text-orange-600' : ''}`}
              >
                <Flame className={`h-4 w-4 ${showHotLeadsOnly ? 'text-orange-500' : ''}`} />
                Hot Leads
                {hotLeadsCount > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                    showHotLeadsOnly 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {hotLeadsCount}
                  </span>
                )}
              </Toggle>

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
            appraisals={filteredAppraisals}
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
