import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, CalendarDays, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ManageTargets } from './ManageTargets';
import { DailyCheckIn } from '@/components/playbook/DailyCheckIn';

export const KPITrackerHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [manageTargetsOpen, setManageTargetsOpen] = useState(false);
  const [dailyCheckInOpen, setDailyCheckInOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">KPI Performance Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Track your metrics, analyze trends, and hit your targets
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setDailyCheckInOpen(true)} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Update Today's Numbers
          </Button>
          <Button onClick={() => setManageTargetsOpen(true)} variant="outline">
            <Target className="h-4 w-4 mr-2" />
            Manage Targets
          </Button>
          <Button onClick={() => navigate('/weekly-logs')} variant="outline">
            <CalendarDays className="h-4 w-4 mr-2" />
            View Weekly Logs
          </Button>
        </div>

        <Dialog open={manageTargetsOpen} onOpenChange={setManageTargetsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Target Management</DialogTitle>
              <DialogDescription>
                Set and adjust your KPI targets
              </DialogDescription>
            </DialogHeader>
            <ManageTargets />
          </DialogContent>
        </Dialog>
      </div>

      <DailyCheckIn
        open={dailyCheckInOpen}
        onOpenChange={setDailyCheckInOpen}
        userId={user?.id || ''}
        onSuccess={() => {
          // Refresh will happen automatically via react-query
        }}
      />
    </>
  );
};
