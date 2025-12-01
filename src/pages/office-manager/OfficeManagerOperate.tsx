import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckSquare, Calendar, MessageSquare } from 'lucide-react';
import TaskManager from '@/pages/TaskManager';
import { useAdminTaskBoard } from '@/hooks/useAdminTaskBoard';
import { Loader2 } from 'lucide-react';

export default function OfficeManagerOperate() {
  const { board, isLoading } = useAdminTaskBoard('office_manager');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">OPERATE</h1>
        <p className="text-muted-foreground">Daily tasks, planning, and team coordination</p>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="planner" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Daily Planner
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6">
          {board && <TaskManager boardId={board.id} />}
        </TabsContent>

        <TabsContent value="planner" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Daily Planner coming soon...
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Messages integration coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
