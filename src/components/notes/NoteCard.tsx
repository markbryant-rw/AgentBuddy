import { Note } from '@/hooks/useNotes';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Archive, Copy, Trash, ExternalLink, Users, Lock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotes } from '@/hooks/useNotes';
import { formatDistanceToNow } from 'date-fns';

interface NoteCardProps {
  note: Note;
  viewMode: 'grid' | 'list';
  onSelect: () => void;
}

const NOTE_BORDER_COLORS = [
  'border-l-4 border-l-blue-500',
  'border-l-4 border-l-purple-500',
  'border-l-4 border-l-pink-500',
  'border-l-4 border-l-orange-500',
  'border-l-4 border-l-green-500',
  'border-l-4 border-l-yellow-500',
];

export const NoteCard = ({ note, viewMode, onSelect }: NoteCardProps) => {
  const { archiveNote, duplicateNote, deleteNote } = useNotes();

  const getPreviewText = () => {
    try {
      if (note.content_rich?.content) {
        const textContent = note.content_rich.content
          .filter((node: any) => node.type === 'paragraph')
          .map((node: any) =>
            node.content?.map((c: any) => c.text || '').join('') || ''
          )
          .join(' ');
        return textContent.substring(0, 120) || 'No content';
      }
    } catch (e) {
      return 'No content';
    }
    return 'No content';
  };

  // Generate consistent color based on note ID
  const getBorderColor = () => {
    const hash = note.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return NOTE_BORDER_COLORS[hash % NOTE_BORDER_COLORS.length];
  };

  if (viewMode === 'list') {
    return (
      <Card 
        className={`note-card p-4 cursor-pointer ${getBorderColor()} relative`} 
        onClick={onSelect}
      >
        <div className="absolute top-2 right-2">
          {note.visibility === 'team' ? (
            <Badge variant="secondary" className="gap-1 text-xs"><Users className="h-3 w-3" />Team</Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-xs"><Lock className="h-3 w-3" />Private</Badge>
          )}
        </div>
        <div className="flex items-center gap-4 pr-20">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate text-lg mb-1">{note.title}</h3>
            <p className="text-sm text-muted-foreground truncate">{getPreviewText()}</p>
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={note.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {note.profiles?.full_name?.[0] || note.profiles?.email[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
              </span>
              {note.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(); }}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateNote.mutate(note.id); }}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); archiveNote.mutate(note.id); }}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); deleteNote.mutate(note.id); }}
                className="text-destructive"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={`note-card overflow-hidden cursor-pointer group ${getBorderColor()} relative`} 
      onClick={onSelect}
    >
      <div className="absolute top-2 right-2 z-10">
        {note.visibility === 'team' ? (
          <Badge variant="secondary" className="gap-1 text-xs"><Users className="h-3 w-3" /></Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-xs"><Lock className="h-3 w-3" /></Badge>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3 pr-16">
          <h3 className="font-semibold line-clamp-2 flex-1 text-lg leading-snug">{note.title}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateNote.mutate(note.id); }}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); archiveNote.mutate(note.id); }}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); deleteNote.mutate(note.id); }}
                className="text-destructive"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
          {getPreviewText()}
        </p>
        
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-3 border-t border-border/50">
          <Avatar className="h-6 w-6">
            <AvatarImage src={note.profiles?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {note.profiles?.full_name?.[0] || note.profiles?.email[0]}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{note.profiles?.full_name || note.profiles?.email}</span>
          <span className="text-muted-foreground/60">•</span>
          <span className="whitespace-nowrap">
            {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Card>
  );
};
