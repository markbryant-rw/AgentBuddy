import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useWeeklyTaskSettings, getDayName } from '@/hooks/useWeeklyTaskSettings';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Transaction } from '@/hooks/useTransactions';

interface TransactionSettingsTabProps {
  transaction: Transaction;
}

export function TransactionSettingsTab({ transaction }: TransactionSettingsTabProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isEnabled, templates } = useWeeklyTaskSettings();

  const handleToggleWeeklyTasks = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ include_weekly_tasks: enabled })
        .eq('id', transaction.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(enabled ? 'Weekly tasks enabled for this listing' : 'Weekly tasks disabled for this listing');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update setting');
    }
  };

  const activeTemplates = templates.filter(t => t.is_active);

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Weekly Listing Tasks
          </CardTitle>
          <CardDescription>
            Automatically generate recurring tasks for this listing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEnabled ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Weekly tasks feature is not enabled for your team.
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate('/team/weekly-tasks')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Set Up Weekly Tasks
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Include in Weekly Tasks</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate recurring tasks for this listing each week
                  </p>
                </div>
                <Switch
                  checked={transaction.include_weekly_tasks !== false}
                  onCheckedChange={handleToggleWeeklyTasks}
                />
              </div>

              {transaction.include_weekly_tasks !== false && activeTemplates.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-2">Tasks that will be generated:</h4>
                  <div className="space-y-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const dayTasks = activeTemplates.filter(t => t.day_of_week === day);
                      if (dayTasks.length === 0) return null;

                      return (
                        <div key={day} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="min-w-16 justify-center text-xs">
                            {getDayName(day).slice(0, 3)}
                          </Badge>
                          <span className="text-muted-foreground">
                            {dayTasks.map(t => t.title).join(', ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => navigate('/team/weekly-tasks')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Configure Team Weekly Tasks
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
