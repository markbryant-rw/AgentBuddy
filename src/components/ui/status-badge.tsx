import { cn } from '@/lib/utils';
import { StageInfoTooltip } from '@/components/appraisals/StageInfoTooltip';
import { AppraisalStage } from '@/hooks/useAppraisalTemplates';

interface StatusBadgeProps {
  stage?: 'VAP' | 'MAP' | 'LAP';
  outcome?: 'In Progress' | 'WON' | 'LOST';
  className?: string;
  showInfo?: boolean;
}

export const StatusBadge = ({ stage, outcome, className, showInfo = false }: StatusBadgeProps) => {
  const getStatusStyles = () => {
    // If outcome is terminal (WON/LOST), show that with appropriate color
    if (outcome === 'WON') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (outcome === 'LOST') {
      return 'bg-red-100 text-red-800 border-red-200';
    }

    // Otherwise show stage
    if (stage === 'VAP') {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (stage === 'MAP') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (stage === 'LAP') {
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    }

    // Default
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusLabel = () => {
    if (outcome === 'WON') return 'WON';
    if (outcome === 'LOST') return 'LOST';
    return stage || 'Unknown';
  };

  const isStageValue = stage && ['VAP', 'MAP', 'LAP'].includes(stage) && !outcome;

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
          getStatusStyles(),
          className
        )}
      >
        {getStatusLabel()}
      </span>
      {showInfo && isStageValue && (
        <StageInfoTooltip stage={stage as AppraisalStage} />
      )}
    </span>
  );
};
