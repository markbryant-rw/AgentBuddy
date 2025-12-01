import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NoteTemplate } from '@/hooks/useNoteTemplates';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Calendar, User, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: NoteTemplate | null;
  onUse: (template: NoteTemplate) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  events: '🎤',
  meetings: '📅',
  listings: '🏠',
  vendors: '🤝',
  personal: '📝',
  general: '📄',
};

export const TemplatePreviewDialog = ({
  open,
  onOpenChange,
  template,
  onUse,
}: TemplatePreviewDialogProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: template?.content_rich || '',
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
  });

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <span>{CATEGORY_ICONS[template.category] || '📄'}</span>
                {template.title}
              </DialogTitle>
              {template.description && (
                <DialogDescription className="mt-2">
                  {template.description}
                </DialogDescription>
              )}
            </div>
            <Badge variant="secondary">{template.category}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {template.is_system ? (
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">System Template</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Created by {template.created_by}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(template.created_at), 'MMM d, yyyy')}</span>
            </div>
            {template.usage_count && template.usage_count > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span>Used {template.usage_count} times</span>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card">
            <div className="p-6">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => {
            onUse(template);
            onOpenChange(false);
          }}>
            Use This Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
