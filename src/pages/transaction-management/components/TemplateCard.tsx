import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Copy, Archive, Eye, CheckSquare, Share2 } from 'lucide-react';
import { ProjectTemplate } from '@/hooks/useProjectTemplates';
import { useProjectTemplates } from '@/hooks/useProjectTemplates';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { TemplateAssignmentDialog } from '@/components/platform/TemplateAssignmentDialog';

const STAGE_COLORS = {
  lead: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  live: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  contract: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  unconditional: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  settled: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
};

const STAGE_LABELS = {
  lead: 'Lead',
  live: 'Live',
  contract: 'Under Contract',
  unconditional: 'Unconditional',
  settled: 'Settled',
};

interface TemplateCardProps {
  template: ProjectTemplate;
  onEdit: (template: ProjectTemplate) => void;
  onView: (template: ProjectTemplate) => void;
  isAdmin: boolean;
}

export const TemplateCard = ({ template, onEdit, onView, isAdmin }: TemplateCardProps) => {
  const { duplicateTemplate, deleteTemplate } = useProjectTemplates();
  const { isPlatformAdmin } = useAuth();
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);

  const handleDuplicate = async () => {
    await duplicateTemplate(template.id);
  };

  const handleArchive = async () => {
    await deleteTemplate(template.id);
  };

  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-all cursor-pointer group",
        template.is_archived && "opacity-60"
      )}
      onClick={() => onView(template)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
              {template.name}
            </CardTitle>
            <Badge className={STAGE_COLORS[template.lifecycle_stage as keyof typeof STAGE_COLORS]}>
              {STAGE_LABELS[template.lifecycle_stage as keyof typeof STAGE_LABELS]}
            </Badge>
          </div>
          
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(template); }}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(template); }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                {isPlatformAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setAssignmentDialogOpen(true); }}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Manage Access
                    </DropdownMenuItem>
                  </>
                )}
                {!template.is_system_default && (
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); handleArchive(); }}
                    className="text-destructive"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              {template.tasks?.length || 0} tasks
            </span>
            {template.usage_count !== undefined && template.usage_count > 0 && (
              <Badge variant="secondary">
                Used {template.usage_count}x
              </Badge>
            )}
          </div>
          {template.is_system_default && (
            <Badge variant="outline">System</Badge>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          Updated {format(new Date(template.updated_at), 'MMM d, yyyy')}
        </div>
      </CardContent>
      
      <TemplateAssignmentDialog
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        templateId={template.id}
        templateName={template.name}
      />
    </Card>
  );
};
