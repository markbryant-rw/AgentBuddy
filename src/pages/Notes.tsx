import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotes } from '@/hooks/useNotes';
import { useTeam } from '@/hooks/useTeam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Plus, Search, Grid3x3, List, Archive, Tag, Video } from 'lucide-react';
import { NoteCard } from '@/components/notes/NoteCard';
import { TemplateGallery } from '@/components/notes/TemplateGallery';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNoteSearch } from '@/hooks/useNoteSearch';
import { KeyboardShortcutsDialog } from '@/components/notes/KeyboardShortcutsDialog';
import { MeetingGenerator } from '@/components/notes/MeetingGenerator';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { PageHeaderWithBack } from '@/components/PageHeaderWithBack';

const Notes = () => {
  const navigate = useNavigate();
  const {
    team
  } = useTeam();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMeetingGenerator, setShowMeetingGenerator] = useState(false);
  const {
    notes,
    isLoading,
    createNote
  } = useNotes({
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    archived: showArchived
  });
  const {
    results: searchResults,
    isLoading: isSearching
  } = useNoteSearch(searchQuery);
  const displayedNotes = searchQuery ? searchResults : notes;
  
  // Get all unique tags from notes - stubbed since tags don't exist
  const allTags: string[] = [];
  
  const handleCreateNote = async (title: string, templateId?: string) => {
    const result = await createNote.mutateAsync({
      title,
    });
    if (result) {
      navigate(`/notes/${result.id}`);
    }
  };
  const handleQuickCreate = () => {
    handleCreateNote('Untitled Note');
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // ? - Show keyboard shortcuts
      if (e.key === '?' && !e.shiftKey) {
        e.preventDefault();
        setShowShortcuts(true);
      }

      // Cmd/Ctrl + N - New note
      if (cmdOrCtrl && e.key === 'n') {
        e.preventDefault();
        handleQuickCreate();
      }

      // Cmd/Ctrl + K - Focus search
      if (cmdOrCtrl && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return <div className="min-h-screen w-full">
      <PageHeaderWithBack 
        title="Notes" 
        description="Capture knowledge, collaborate, and create brilliance ✨"
        backPath="/operate-dashboard"
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in">
        {/* Action Buttons */}
        <div className="mb-6">
          <div className="flex items-center justify-end">
            <div className="flex gap-3">
              <Button
                variant={showArchived ? "default" : "outline"}
                onClick={() => setShowArchived(!showArchived)}
                className="border-primary/20"
              >
                <Archive className="h-4 w-4 mr-2" />
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </Button>
              
              <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
                    <Grid3x3 className="h-4 w-4 mr-2" />
                    Templates
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Choose a Template</DialogTitle>
                  </DialogHeader>
                  <TemplateGallery onSelect={template => {
                  handleCreateNote(template.title, template.id);
                  setShowTemplates(false);
                }} />
                </DialogContent>
              </Dialog>
              <Button onClick={() => setShowMeetingGenerator(true)}>
                <Video className="h-4 w-4 mr-2" />
                Meeting Generator
              </Button>
                <Button onClick={handleQuickCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Note
                </Button>
              </div>
            </div>
          </div>

        <div className="space-y-4">

          {/* Search and View Controls */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search notes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            
            {allTags.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-primary/20">
                    <Tag className="h-4 w-4 mr-2" />
                    Tags
                    {selectedTags.length > 0 && (
                      <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                        {selectedTags.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background">
                  <DropdownMenuLabel>Filter by tags</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allTags.map(tag => (
                    <DropdownMenuCheckboxItem
                      key={tag}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => toggleTag(tag)}
                    >
                      {tag}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <Tabs value={viewMode} onValueChange={v => setViewMode(v as 'grid' | 'list')}>
              <TabsList>
                <TabsTrigger value="grid">
                  <Grid3x3 className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Notes Grid/List */}
          {isLoading || isSearching ? <div className="text-center py-16 animate-fade-in">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent mb-4" />
              <p className="text-muted-foreground">Loading notes...</p>
            </div> : displayedNotes.length === 0 ? <div className="text-center py-16 animate-fade-in">
              <div className="note-card max-w-md mx-auto p-12">
                <FileText className="h-16 w-16 mx-auto mb-6 text-primary/40" />
                <h3 className="text-2xl font-semibold mb-3">No notes yet</h3>
                <p className="text-muted-foreground mb-6 text-base leading-relaxed">
                  {searchQuery ? 'No notes found matching your search. Try different keywords or create a new note!' : 'Your note collection is empty. Start capturing your ideas, meeting notes, and brilliant thoughts!'}
                </p>
                {!searchQuery && <Button onClick={handleQuickCreate} size="lg" className="shadow-md">
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Note
                  </Button>}
              </div>
            </div> : <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-2'}>
              {displayedNotes.map(note => <NoteCard key={note.id} note={note} viewMode={viewMode} onSelect={() => navigate(`/notes/${note.id}`)} />)}
            </div>}
        </div>

        {/* Keyboard Shortcuts Dialog */}
        <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      </div>
    </div>;
};
export default Notes;