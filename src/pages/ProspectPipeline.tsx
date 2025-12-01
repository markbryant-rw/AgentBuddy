import ListingPipeline from './ListingPipeline';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';

const ProspectPipeline = () => {
  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="prospect" currentPage="Opportunity Pipeline" />
      <div className="flex-1 overflow-auto">
        <ListingPipeline />
      </div>
    </div>
  );
};

export default ProspectPipeline;
