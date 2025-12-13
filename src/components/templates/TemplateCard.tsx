import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Copy, 
  Edit2, 
  MoreVertical, 
  Trash2, 
  Lock,
  Mail,
  MessageSquare,
  FileText,
  ListChecks
} from 'lucide-react';

interface TemplateCardProps {
  id: string;
  name: string;
  description?: string | null;
  type: 'task' | 'email' | 'sms' | 'note';
  scope: 'platform' | 'office' | 'team' | 'user';
  isSystem: boolean;
  isDefault?: boolean;
  stage?: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const typeIcons = {
  task: ListChecks,
  email: Mail,
  sms: MessageSquare,
  note: FileText,
};

const scopeLabels = {
  platform: 'System',
  office: 'Office',
  team: 'Team',
  user: 'Personal',
};

const scopeColors = {
  platform: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  office: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  team: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  user: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export function TemplateCard({
  id,
  name,
  description,
  type,
  scope,
  isSystem,
  isDefault,
  stage,
  onEdit,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  const Icon = typeIcons[type];

  return (
    <Card className="p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm truncate">{name}</h4>
              {isSystem && (
                <Lock className="h-3 w-3 text-muted-foreground" />
              )}
              {isDefault && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Default
                </Badge>
              )}
            </div>
            {stage && (
              <p className="text-xs text-muted-foreground mt-0.5">{stage}</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant="outline" 
                className={`text-[10px] px-1.5 py-0 ${scopeColors[scope]}`}
              >
                {scopeLabels[scope]}
              </Badge>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[12000]">
            {!isSystem && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              {isSystem ? 'Copy to customize' : 'Duplicate'}
            </DropdownMenuItem>
            {!isSystem && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
