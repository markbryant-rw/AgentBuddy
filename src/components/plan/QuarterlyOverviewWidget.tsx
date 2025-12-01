import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { QuarterNavigator } from './QuarterNavigator';
import { WeeklyOverview } from './WeeklyOverview';
import { DetailedDrillDown } from './DetailedDrillDown';

interface Week {
  weekNumber: number;
  cch: number;
  target: number;
  isCurrentWeek: boolean;
  isFuture: boolean;
}

interface QuarterlyOverviewWidgetProps {
  userId: string;
  year: number;
  quarter: number;
  onQuarterChange: (year: number, quarter: number) => void;
  weeks: Week[];
  isLoading: boolean;
}

export function QuarterlyOverviewWidget({
  userId,
  year,
  quarter,
  onQuarterChange,
  weeks,
  isLoading
}: QuarterlyOverviewWidgetProps) {
  const [isDetailedOpen, setIsDetailedOpen] = useState(false);

  return (
    <Card className="p-6">
      {/* Header with Quarter Navigator */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">This Quarter's Outlook</h3>
        <QuarterNavigator
          year={year}
          quarter={quarter}
          onNavigate={onQuarterChange}
        />
      </div>

      {/* 13-Week Overview Grid */}
      <div className="mb-6">
        <WeeklyOverview weeks={weeks} isLoading={isLoading} />
      </div>

      {/* Collapsible Detailed Breakdown */}
      <Collapsible open={isDetailedOpen} onOpenChange={setIsDetailedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full">
            <span>View Detailed Performance Breakdown</span>
            {isDetailedOpen ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-6">
          <DetailedDrillDown 
            userId={userId} 
            year={year}
            quarter={quarter}
          />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}