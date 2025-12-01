import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, CheckSquare } from 'lucide-react';
import { ProjectTemplate } from '@/hooks/useProjectTemplates';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

const STAGE_LABELS = {
  lead: 'Lead',
  live: 'Live',
  contract: 'Under Contract',
  unconditional: 'Unconditional',
  settled: 'Settled',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
};

interface TemplateDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ProjectTemplate;
  onEdit: () => void;
}

export const TemplateDetailDialog = ({ open, onOpenChange, template, onEdit }: TemplateDetailDialogProps) => {
  const { hasAnyRole } = useAuth();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-6 w-6" />
              {template.name}
            </DialogTitle>
            {hasAnyRole(['platform_admin', 'office_manager', 'team_leader']) && !template.is_system_default && (
              <Button onClick={onEdit} size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex items-center gap-3">
            <Badge>
              {STAGE_LABELS[template.lifecycle_stage as keyof typeof STAGE_LABELS]}
            </Badge>
            {template.is_system_default && (
              <Badge variant="outline">System Default</Badge>
            )}
            {template.usage_count !== undefined && template.usage_count > 0 && (
              <Badge variant="secondary">Used {template.usage_count} times</Badge>
            )}
          </div>

          {template.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{template.description}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-3">Tasks ({template.tasks?.length || 0})</h3>
            <div className="space-y-3">
              {template.tasks?.map((task, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-card space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <Badge className={PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}>
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Due: {task.due_offset_days === 0 ? 'Same day' : `+${task.due_offset_days} days`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t text-sm text-muted-foreground space-y-1">
            <div>Last updated: {format(new Date(template.updated_at), 'PPP')}</div>
            {template.template_version && (
              <div>Version: {template.template_version}</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
