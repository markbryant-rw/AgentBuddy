import { useState, useEffect } from 'react';
import { DailyTaskView } from '@/components/tasks/daily/DailyTaskView';
import { Button } from '@/components/ui/button';
import { Calendar, Kanban, Grid3x3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DailyTasks() {
  const navigate = useNavigate();

  // Redirect to new daily planner
  useEffect(() => {
    navigate('/daily-planner', { replace: true });
  }, [navigate]);

  return (
    <div className="h-full flex flex-col">
      {/* Navigation Tabs */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => navigate('/tasks')}
            >
              <Calendar className="h-4 w-4" />
              Daily Planner
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-2"
            >
              <Kanban className="h-4 w-4" />
              Projects
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => navigate('/tasks/matrix')}
            >
              <Grid3x3 className="h-4 w-4" />
              Matrix
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <DailyTaskView />
        </div>
      </div>
    </div>
  );
}
