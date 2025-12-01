import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRecurringTasks } from '@/hooks/useRecurringTasks';
import { RecurringTaskDialog } from './RecurringTaskDialog';
import { Repeat, Trash2, Pause, Play, Plus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RecurringTasksManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecurringTasksManager({ open, onOpenChange }: RecurringTasksManagerProps) {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useRecurringTasks();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getRecurrenceLabel = (template: any) => {
    if (template.recurrence_type === 'daily') return 'Daily';
    if (template.recurrence_type === 'weekly') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const selectedDays = template.recurrence_days?.map((d: number) => days[d - 1]) || [];
      return `Weekly: ${selectedDays.join(', ')}`;
    }
    if (template.recurrence_type === 'monthly') {
      return `Monthly: ${template.recurrence_days?.join(', ')}`;
    }
    return '';
  };

  const getCategoryLabel = (category: string) => {
    if (category === 'big') return 'High-Impact';
    if (category === 'medium') return 'Important';
    if (category === 'little') return 'Quick Win';
    return category;
  };

  const handleToggleActive = (template: any) => {
    updateTemplate({
      id: template.id,
      updates: { is_active: !template.is_active },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Manage Recurring Tasks
            </DialogTitle>
            <DialogDescription>
              View and manage your recurring task templates
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button onClick={() => setCreateDialogOpen(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create New Recurring Task
            </Button>

            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading templates...
              </div>
            )}

            {!isLoading && templates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Repeat className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No recurring tasks yet</p>
                <p className="text-sm">Create your first recurring task to get started</p>
              </div>
            )}

            {!isLoading && templates.length > 0 && (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{template.title}</h4>
                          {!template.is_active && (
                            <Badge variant="secondary">Paused</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getRecurrenceLabel(template)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(template)}
                          title={template.is_active ? 'Pause' : 'Resume'}
                        >
                          {template.is_active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(template.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">{getCategoryLabel(template.size_category)}</Badge>
                      {template.estimated_minutes && (
                        <Badge variant="outline">{template.estimated_minutes} min</Badge>
                      )}
                      <Badge variant="outline">
                        Starts: {format(new Date(template.start_date), 'MMM d, yyyy')}
                      </Badge>
                      {template.end_date && (
                        <Badge variant="outline">
                          Ends: {format(new Date(template.end_date), 'MMM d, yyyy')}
                        </Badge>
                      )}
                    </div>

                    {template.notes && (
                      <p className="text-sm text-muted-foreground">{template.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RecurringTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={createTemplate}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop generating new instances of this task. Existing tasks will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  deleteTemplate(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
