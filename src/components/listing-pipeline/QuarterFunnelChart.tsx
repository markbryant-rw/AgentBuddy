import { memo } from 'react';
import { STAGE_COLORS } from '@/lib/stageColors';
import { cn } from '@/lib/utils';

interface QuarterFunnelData {
  call: number;
  vap: number;
  map: number;
  lap: number;
  won: number;
}

interface QuarterFunnelChartProps {
  data: QuarterFunnelData;
}

// Move static data outside component
const stages = [
  { key: 'call' as const, label: STAGE_COLORS.call.label, bg: STAGE_COLORS.call.bg, text: STAGE_COLORS.call.text },
  { key: 'vap' as const, label: STAGE_COLORS.vap.label, bg: STAGE_COLORS.vap.bg, text: STAGE_COLORS.vap.text },
  { key: 'map' as const, label: STAGE_COLORS.map.label, bg: STAGE_COLORS.map.bg, text: STAGE_COLORS.map.text },
  { key: 'lap' as const, label: STAGE_COLORS.lap.label, bg: STAGE_COLORS.lap.bg, text: STAGE_COLORS.lap.text },
  { key: 'won' as const, label: STAGE_COLORS.won.label, bg: STAGE_COLORS.won.bg, text: STAGE_COLORS.won.text },
];

const QuarterFunnelChartComponent = ({ data }: QuarterFunnelChartProps) => {

  const maxCount = Math.max(...Object.values(data));
  const hasData = maxCount > 0;

  if (!hasData) {
    return (
      <div className="text-center py-4 text-muted-foreground text-xs">
        No opportunities
      </div>
    );
  }

  return (
    <div className="space-y-1 mt-3">
      {stages.map((stage) => {
        const count = data[stage.key];
        const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const minWidth = count > 0 ? 40 : 0;
        
        return (
          <div 
            key={stage.key}
            className="flex justify-center"
          >
            <div
              className={cn(
                "py-1.5 px-3 rounded text-xs font-medium text-center transition-all",
                stage.bg,
                stage.text
              )}
              style={{ 
                width: `${Math.max(widthPercent, minWidth)}%`,
                minWidth: count > 0 ? '40%' : '0%',
              }}
            >
              {count > 0 ? `${stage.label}: ${count}` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const QuarterFunnelChart = memo(QuarterFunnelChartComponent);
