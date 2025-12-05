import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AppraisalStage, APPRAISAL_STAGE_DESCRIPTIONS, APPRAISAL_STAGE_DISPLAY_NAMES } from '@/hooks/useAppraisalTemplates';
import { cn } from '@/lib/utils';

interface StageInfoTooltipProps {
  stage: AppraisalStage;
  className?: string;
}

export const StageInfoTooltip = ({ stage, className }: StageInfoTooltipProps) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info 
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help transition-colors",
              className
            )} 
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px]">
          <p className="font-semibold mb-1">{APPRAISAL_STAGE_DISPLAY_NAMES[stage]}</p>
          <p className="text-xs text-muted-foreground">{APPRAISAL_STAGE_DESCRIPTIONS[stage]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
