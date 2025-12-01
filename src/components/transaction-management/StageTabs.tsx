import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { TransactionStage } from '@/hooks/useTransactions';

interface StageTabsProps {
  activeStage: TransactionStage;
  onStageChange: (stage: TransactionStage) => void;
  stageCounts: Record<TransactionStage, number>;
}

const STAGE_CONFIG: Record<TransactionStage, { label: string; color: string }> = {
  signed: { label: '01. Signed', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  live: { label: '02. Live', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  contract: { label: '03. Under Contract', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  unconditional: { label: '04. Unconditional', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  settled: { label: '05. Settled', color: 'bg-gray-100 text-gray-700 border-gray-300' },
};

export const StageTabs = ({ activeStage, onStageChange, stageCounts }: StageTabsProps) => {
  return (
    <Tabs value={activeStage} onValueChange={(value) => onStageChange(value as TransactionStage)} className="w-full">
      <TabsList className="grid w-full grid-cols-5 h-auto gap-2 bg-transparent">
        {(Object.keys(STAGE_CONFIG) as TransactionStage[]).map((stage) => (
          <TabsTrigger
            key={stage}
            value={stage}
            className="flex items-center justify-between gap-2 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <span className="font-medium">{STAGE_CONFIG[stage].label}</span>
            <Badge variant="secondary" className={`ml-2 ${STAGE_CONFIG[stage].color}`}>
              {stageCounts[stage] || 0}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
