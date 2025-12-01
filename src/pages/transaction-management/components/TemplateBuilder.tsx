import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface Task {
  title: string;
  priority: string;
  due_offset_days: number;
  description?: string;
}

interface TemplateBuilderProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
}

export const TemplateBuilder = ({ tasks, onTasksChange }: TemplateBuilderProps) => {
  const addTask = () => {
    onTasksChange([...tasks, { title: '', priority: 'medium', due_offset_days: 0 }]);
  };

  const removeTask = (index: number) => {
    onTasksChange(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: keyof Task, value: any) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    onTasksChange(newTasks);
  };

  return (
    <div className="space-y-4">
      {tasks.map((task, index) => (
        <div key={index} className="p-4 border rounded-lg space-y-3 bg-card">
          <div className="flex items-start gap-3">
            <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
            <div className="flex-1 space-y-3">
              <Input
                placeholder="Task title *"
                value={task.title}
                onChange={(e) => updateTask(index, 'title', e.target.value)}
              />
              <Textarea
                placeholder="Task description (optional)"
                value={task.description || ''}
                onChange={(e) => updateTask(index, 'description', e.target.value)}
                rows={2}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Priority</label>
                  <Select
                    value={task.priority}
                    onValueChange={(value) => updateTask(index, 'priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Due (days from start)</label>
                  <Input
                    type="number"
                    min="0"
                    value={task.due_offset_days}
                    onChange={(e) => updateTask(index, 'due_offset_days', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeTask(index)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      
      <Button
        type="button"
        variant="outline"
        onClick={addTask}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Task
      </Button>
    </div>
  );
};
