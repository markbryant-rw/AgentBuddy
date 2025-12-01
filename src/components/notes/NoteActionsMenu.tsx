import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Sparkles, FileDown, Save, Archive } from 'lucide-react';
import { AIActionsMenu } from './AIActionsMenu';
import { ExportMenu } from './ExportMenu';

interface NoteActionsMenuProps {
  noteId: string;
  onAIContentUpdate: (content: any) => void;
  onSaveTemplate: () => void;
  onArchive: () => void;
  title: string;
  content: any;
}

export function NoteActionsMenu({
  noteId,
  onAIContentUpdate,
  onSaveTemplate,
  onArchive,
  title,
  content,
}: NoteActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <AIActionsMenu 
          noteId={noteId} 
          onContentUpdate={onAIContentUpdate}
          asDropdownItems
        />
        
        <DropdownMenuSeparator />
        
        <ExportMenu 
          title={title} 
          content={content}
          asDropdownItems
        />
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onSaveTemplate}>
          <Save className="h-4 w-4 mr-2" />
          Save as Template
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onArchive}>
          <Archive className="h-4 w-4 mr-2" />
          Archive Note
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
