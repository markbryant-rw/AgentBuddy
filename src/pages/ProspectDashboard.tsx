import { useState } from 'react';
import { Target } from 'lucide-react';
import { useLoggedAppraisals } from '@/hooks/useLoggedAppraisals';
import { useListingPipeline } from '@/hooks/useListingPipeline';
import { useProspectGeocoding } from '@/hooks/useProspectGeocoding';
import ProspectMap from '@/components/prospects/ProspectMap';
import AppraisalDetailDialog from '@/components/appraisals/AppraisalDetailDialog';
import ProspectNavigationCards from '@/components/prospects/ProspectNavigationCards';
import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';

const ProspectDashboard = () => {
  const { appraisals, loading: appraisalsLoading, stats: appraisalStats } = useLoggedAppraisals();
  const { listings, loading: listingsLoading, stats: pipelineStats } = useListingPipeline();
  const { geocodeAll, isGeocoding } = useProspectGeocoding();
  const [selectedAppraisal, setSelectedAppraisal] = useState<LoggedAppraisal | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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

  const handleAutoGeocode = () => {
    // Geocode both appraisals and listings
    geocodeAll(appraisals, listings);
  };

  return (
    <div className="space-y-fluid-lg p-fluid-lg">
      {/* Header */}
      <div>
        <div className="flex items-center gap-fluid-md">
          <Target className="h-icon-lg w-icon-lg text-primary" />
          <h1 className="text-fluid-3xl font-bold">Prospect Dashboard</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-fluid-base">
          Track appraisals and manage your opportunity pipeline
        </p>
      </div>

      {/* Navigation Cards - Moved to Top */}
      <ProspectNavigationCards 
        appraisals={appraisals}
        listings={listings}
        appraisalStats={appraisalStats}
        pipelineStats={pipelineStats}
      />

      {/* Map View - Larger */}
      <ProspectMap 
        appraisals={appraisals}
        opportunities={listings}
        onAppraisalClick={handleAppraisalClick}
        onAutoGeocode={handleAutoGeocode}
        isGeocoding={isGeocoding}
      />

      {/* Detail Dialog */}
      <AppraisalDetailDialog
        appraisal={selectedAppraisal}
        open={isDetailDialogOpen}
        onOpenChange={handleDialogClose}
        isNew={isAddDialogOpen}
      />
    </div>
  );
};

export default ProspectDashboard;
