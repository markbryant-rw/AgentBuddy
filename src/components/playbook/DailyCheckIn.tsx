import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Minus, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useCCH } from '@/hooks/useCCH';
import { useQueryClient } from '@tanstack/react-query';

interface DailyCheckInProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
  selectedDate?: Date;
}

export const DailyCheckIn = ({ open, onOpenChange, userId, onSuccess, selectedDate }: DailyCheckInProps) => {
  const [calls, setCalls] = useState(0);
  const [openHomes, setOpenHomes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  
  const queryClient = useQueryClient();
  const { weeklyCCH, weeklyCCHTarget } = useCCH();
  
  // CCH calculation will include pipeline appraisals in handleSubmit
  const calculatedCCH = (calls / 20) + (openHomes / 2);
  const projectedWeeklyCCH = weeklyCCH + calculatedCCH;

  // Load today's existing data when dialog opens
  useEffect(() => {
    const loadTodayData = async () => {
      if (!open || !userId) return;
      
      setInitialLoading(true);
      try {
        const dateToLoad = selectedDate || new Date();
        const today = format(dateToLoad, 'yyyy-MM-dd');
        const { data, error } = await (supabase as any)
          .from('daily_activities')
          .select('*')
          .eq('user_id', userId)
          .eq('activity_date', today)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setCalls(data.calls || 0);
          setOpenHomes(data.open_homes || 0);
        } else {
          // Reset to 0 if no data for today (new day)
          setCalls(0);
          setOpenHomes(0);
        }
      } catch (error) {
        console.error('Error loading today\'s data:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadTodayData();
  }, [open, userId, selectedDate]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const dateToSave = selectedDate || new Date();
      const today = format(dateToSave, 'yyyy-MM-dd');

      const { count: todayAppraisals } = await (supabase as any)
        .from('logged_appraisals')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .eq('appraisal_date', today);

      const accurateCCH = (calls / 20) + (todayAppraisals || 0) + (openHomes / 2);

      const { error } = await (supabase as any)
        .from('daily_activities')
        .upsert({
          user_id: userId,
          activity_date: today,
          calls,
          open_homes: openHomes,
          cch_calculated: accurateCCH,
        }, {
          onConflict: 'user_id,activity_date',
        });

      if (error) throw error;

      // Invalidate all relevant queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['weekly-cch-comparison'] });
      await queryClient.invalidateQueries({ queryKey: ['quarterly-weeks'] });
      await queryClient.invalidateQueries({ queryKey: ['weekly-cch'] });
      await queryClient.invalidateQueries({ queryKey: ['cch'] });

      toast.success('Check-in complete!', {
        description: `${accurateCCH.toFixed(1)} CCH logged for today`,
      });

      onSuccess();
      // Keep dialog open to allow multiple updates throughout the day
      // Don't reset form - it will reload existing data if reopened
    } catch (error) {
      console.error('Error saving check-in:', error);
      toast.error('Failed to save check-in');
    } finally {
      setLoading(false);
    }
  };

  const adjust = (setter: (v: number) => void, current: number, delta: number) => {
    setter(Math.max(0, current + delta));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg overflow-hidden p-0">
        {/* Purple Gradient Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <div className="flex items-center gap-3 text-white">
            <CheckCircle2 className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">Daily Check-In</h2>
              <p className="text-indigo-100 text-sm">
                {format(selectedDate || new Date(), 'EEEE, MMMM d, yyyy · h:mm a')}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <p className="text-muted-foreground mb-6 mt-2">
            {initialLoading ? 'Loading today\'s activity...' : 'Update your activities throughout the day - your progress is saved automatically'}
          </p>

          {initialLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {/* Calls */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📞</span>
                    <Label className="text-base font-semibold">How many calls did you make?</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => adjust(setCalls, calls, -10)}
                      disabled={calls === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={calls}
                      onChange={(e) => setCalls(Math.max(0, parseInt(e.target.value) || 0))}
                      className="text-center text-2xl font-bold h-14"
                      min="0"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => adjust(setCalls, calls, 10)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                    20 calls = 1.0 CCH
                  </p>
                </div>

                {/* Appraisals Note */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📋</span>
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">Appraisals tracked automatically</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        When you add appraisals to your pipeline, they're automatically counted toward your weekly CCH and quarterly goals.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Open Homes */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🏠</span>
                    <Label className="text-base font-semibold">How many open homes did you hold?</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => adjust(setOpenHomes, openHomes, -1)}
                      disabled={openHomes === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={openHomes}
                      onChange={(e) => setOpenHomes(Math.max(0, parseInt(e.target.value) || 0))}
                      className="text-center text-2xl font-bold h-14"
                      min="0"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => adjust(setOpenHomes, openHomes, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                    2 open homes = 1.0 CCH
                  </p>
                </div>
              </div>

              {/* Summary Card */}
              <Card className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 p-6 mt-6">
                {/* Today's CCH */}
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-medium text-muted-foreground">Today's CCH:</span>
                  <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                    {calculatedCCH.toFixed(1)}
                  </span>
                </div>

                {/* Week Total Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Week Total:</span>
                    <span className="text-xl font-bold">
                      {projectedWeeklyCCH.toFixed(1)} / {weeklyCCHTarget.toFixed(1)}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  {projectedWeeklyCCH >= weeklyCCHTarget ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Target exceeded!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {(weeklyCCHTarget - projectedWeeklyCCH).toFixed(1)} CCH to go
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Two-Button Layout */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || initialLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Submit Check-In'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
