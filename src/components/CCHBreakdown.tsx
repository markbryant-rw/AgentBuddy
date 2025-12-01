import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { calculateCCH } from '@/lib/cchCalculations';
import { Info } from 'lucide-react';

interface CCHBreakdownProps {
  calls: number;
  appraisals: number;
  openHomes: number;
  weeklyBreakdown?: {
    calls: number;
    appraisals: number;
    open_homes: number;
  };
  weeklyCCH?: number;
  weeklyCCHTarget?: number;
}

export const CCHBreakdown = ({ 
  calls, 
  appraisals, 
  openHomes,
  weeklyBreakdown,
  weeklyCCH,
  weeklyCCHTarget,
}: CCHBreakdownProps) => {
  const dailyCCH = calculateCCH(calls, appraisals, openHomes);
  const weeklyCCHData = weeklyBreakdown 
    ? calculateCCH(weeklyBreakdown.calls, weeklyBreakdown.appraisals, weeklyBreakdown.open_homes)
    : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="h-4 w-4 mr-1" />
          View Breakdown
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>CCH Breakdown</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Calls: {calls}</span>
              <span className="text-sm font-medium">
                → {dailyCCH.breakdown.callsHours.toFixed(1)} hrs
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Appraisals: {appraisals}</span>
              <span className="text-sm font-medium">
                → {dailyCCH.breakdown.appraisalsHours.toFixed(1)} hrs
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Open Homes: {openHomes}</span>
              <span className="text-sm font-medium">
                → {dailyCCH.breakdown.openHomesHours.toFixed(1)} hrs
              </span>
            </div>
            <div className="pt-3 border-t flex items-center justify-between">
              <span className="font-semibold">Total CCH:</span>
              <span className="text-xl font-bold">{dailyCCH.total.toFixed(1)} hrs</span>
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-3 pt-4">
            {weeklyBreakdown && weeklyCCHData ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Calls: {weeklyBreakdown.calls}</span>
                  <span className="text-sm font-medium">
                    → {weeklyCCHData.breakdown.callsHours.toFixed(1)} hrs
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Appraisals: {weeklyBreakdown.appraisals}</span>
                  <span className="text-sm font-medium">
                    → {weeklyCCHData.breakdown.appraisalsHours.toFixed(1)} hrs
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Open Homes: {weeklyBreakdown.open_homes}</span>
                  <span className="text-sm font-medium">
                    → {weeklyCCHData.breakdown.openHomesHours.toFixed(1)} hrs
                  </span>
                </div>
                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total CCH:</span>
                    <span className="text-xl font-bold">{weeklyCCH?.toFixed(1)} hrs</span>
                  </div>
                  {weeklyCCHTarget && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Target:</span>
                        <span className="font-medium">{weeklyCCHTarget.toFixed(1)} hrs</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress:</span>
                        <span className="font-medium">
                          {weeklyCCHTarget > 0 ? ((weeklyCCH || 0) / weeklyCCHTarget * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No weekly data available
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
