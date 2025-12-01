import { useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Archive, Tag, Users, Building, Lock, UserPlus } from 'lucide-react';
import { useNotes } from '@/hooks/useNotes';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar';

interface NoteSidebarProps {
  selectedTags: string[];
  onTagSelect: (tags: string[]) => void;
  showArchived: boolean;
  onToggleArchived: () => void;
}

export const NoteSidebar = ({
  selectedTags,
  onTagSelect,
  showArchived,
  onToggleArchived,
}: NoteSidebarProps) => {
  const { notes } = useNotes();
  const { open } = useSidebar();

  // Extract unique tags from all notes
  const allTags = useMemo(() => {
    return Array.from(
      new Set(notes.flatMap((note) => note.tags))
    ).sort();
  }, [notes]);

  const tagCounts = useMemo(() => {
    return allTags.reduce((acc, tag) => {
      acc[tag] = notes.filter((note) => note.tags.includes(tag)).length;
      return acc;
    }, {} as Record<string, number>);
  }, [notes, allTags]);

  const toggleTag = useCallback((tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagSelect(selectedTags.filter((t) => t !== tag));
    } else {
      onTagSelect([...selectedTags, tag]);
    }
  }, [selectedTags, onTagSelect]);

  const notebookCounts = useMemo(() => {
    return {
      private: notes.filter((n) => n.visibility === 'private').length,
      team: notes.filter((n) => n.visibility === 'team').length,
      office: notes.filter((n) => n.visibility === 'office').length,
      friend: notes.filter((n) => n.visibility === 'friend').length,
    };
  }, [notes]);

  const recentNotes = notes.slice(0, 5);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="gap-4 pt-4">
        {/* Notebooks */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-2">
            <FileText className="h-4 w-4" />
            {open && <span>Notebooks</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-1 px-2">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Lock className="h-4 w-4 mr-2" />
                {open && (
                  <>
                    <span>Private</span>
                    <Badge variant="secondary" className="ml-auto">{notebookCounts.private}</Badge>
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                {open && (
                  <>
                    <span>Team</span>
                    <Badge variant="secondary" className="ml-auto">{notebookCounts.team}</Badge>
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Building className="h-4 w-4 mr-2" />
                {open && (
                  <>
                    <span>Office</span>
                    <Badge variant="secondary" className="ml-auto">{notebookCounts.office}</Badge>
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <UserPlus className="h-4 w-4 mr-2" />
                {open && (
                  <>
                    <span>Friends</span>
                    <Badge variant="secondary" className="ml-auto">{notebookCounts.friend}</Badge>
                  </>
                )}
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tags */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-2">
            <Tag className="h-4 w-4" />
            {open && <span>Tags</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-1 max-h-48 overflow-y-auto px-2">
              {allTags.length === 0 ? (
                open && <p className="text-sm text-muted-foreground px-2">No tags yet</p>
              ) : (
                allTags.map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => toggleTag(tag)}
                  >
                    <Tag className="h-3 w-3 mr-2" />
                    {open && (
                      <>
                        <span>{tag}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {tagCounts[tag]}
                        </Badge>
                      </>
                    )}
                  </Button>
                ))
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent Notes */}
        {open && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2">Recent</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2 px-4">
                {recentNotes.map((note) => (
                  <div key={note.id} className="text-sm">
                    <p className="font-medium truncate">{note.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Archive Toggle */}
        <div className="px-2 mt-auto pb-4">
          <Button
            variant={showArchived ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-start"
            onClick={onToggleArchived}
          >
            <Archive className="h-4 w-4 mr-2" />
            {open && <span>{showArchived ? 'Hide Archived' : 'Show Archived'}</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};
