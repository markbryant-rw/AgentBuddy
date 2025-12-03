import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  stage?: 'VAP' | 'MAP' | 'LAP';
  outcome?: 'In Progress' | 'WON' | 'LOST';
  className?: string;
}

export const StatusBadge = ({ stage, outcome, className }: StatusBadgeProps) => {
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

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        getStatusStyles(),
        className
      )}
    >
      {getStatusLabel()}
    </span>
  );
};
