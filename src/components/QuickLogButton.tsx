import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardEdit, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DailyCheckIn } from '@/components/playbook/DailyCheckIn';

interface QuickLogButtonProps {
  hasLoggedToday: boolean;
  onLogSuccess?: () => void;
}

export const QuickLogButton = ({ hasLoggedToday, onLogSuccess }: QuickLogButtonProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dailyCheckInOpen, setDailyCheckInOpen] = useState(false);

  return (
    <>
      <div className="space-y-2">
        <Button
          variant="default"
          className="w-full"
          onClick={() => setDailyCheckInOpen(true)}
        >
          <ClipboardEdit className="mr-2 h-4 w-4" />
          {hasLoggedToday ? "Update Today's Numbers" : "Log Today's Numbers"}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/weekly-logs')}
        >
          <Calendar className="mr-2 h-4 w-4" />
          View Weekly Logs
        </Button>
      </div>

      <DailyCheckIn
        open={dailyCheckInOpen}
        onOpenChange={setDailyCheckInOpen}
        userId={user?.id || ''}
        onSuccess={() => {
          onLogSuccess?.();
        }}
      />
    </>
  );
};
