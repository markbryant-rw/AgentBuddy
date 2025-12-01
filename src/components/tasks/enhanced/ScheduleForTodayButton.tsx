import { Button } from '@/components/ui/button';
import { CalendarPlus } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ScheduleForTodayButtonProps {
  taskId: string;
}

export function ScheduleForTodayButton({ taskId }: ScheduleForTodayButtonProps) {
  const { updateTask } = useTasks();
  const { toast } = useToast();

  const handleSchedule = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    await updateTask({
      taskId,
      updates: {
        // @ts-ignore - New fields not yet in generated types
        scheduled_date: today,
        size_category: 'medium',
        estimated_duration_minutes: 30,
      },
    });

    toast({
      title: 'Scheduled for today',
      description: 'Task added to your Today\'s Focus list',
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleSchedule}
    >
      <CalendarPlus className="h-4 w-4" />
      Schedule for Today
    </Button>
  );
}
