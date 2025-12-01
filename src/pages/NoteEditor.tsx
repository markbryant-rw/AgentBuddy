import { useParams, useNavigate } from 'react-router-dom';
import { useNote, useNotes } from '@/hooks/useNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Share2, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { RichTextEditor } from '@/components/notes/RichTextEditor';
import { NoteCommentBox } from '@/components/notes/NoteCommentBox';
import { ShareNoteDialog } from '@/components/notes/ShareNoteDialog';
import { SaveTemplateDialog } from '@/components/notes/SaveTemplateDialog';
import { NoteVisibilitySelector } from '@/components/notes/NoteVisibilitySelector';
import { NoteFriendSelector } from '@/components/notes/NoteFriendSelector';
import { NoteActionsMenu } from '@/components/notes/NoteActionsMenu';
import { useNotePresence } from '@/hooks/useNotePresence';
import { useNoteKeyboardShortcuts } from '@/hooks/useNoteKeyboardShortcuts';
import { useNoteFriendShares } from '@/hooks/useNoteFriendShares';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { AIAssistantPanel } from '@/components/notes/AIAssistantPanel';

const NoteEditor = () => {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { note, isLoading } = useNote(noteId);
  const { updateNote } = useNotes();
  const { activeUsers } = useNotePresence(noteId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<any>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [recentlySaved, setRecentlySaved] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'team' | 'office' | 'friend'>('private');
  const [showAIPanel, setShowAIPanel] = useState(false);

  const { shares, updateShares } = useNoteFriendShares(noteId || '');

  const debouncedTitle = useDebounce(title, 3000);
  const debouncedContent = useDebounce(content, 3000);
  const debouncedTags = useDebounce(tags, 3000);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setTags(note.tags);
      setContent(note.content_rich || { type: 'doc', content: [] });
      setVisibility((note.visibility as 'private' | 'team' | 'office' | 'friend') || 'private');
    }
  }, [note]);

  // Auto-save DISABLED - causes infinite loop and crashes
  // useEffect(() => {
  //   let timer: NodeJS.Timeout;
  //   
  //   const autoSave = async () => {
  //     if (!noteId || !note || !content) return;
  //     
  //     setIsSaving(true);
  //     try {
  //       await updateNote.mutateAsync({
  //         id: noteId,
  //         title: debouncedTitle,
  //         content_rich: debouncedContent,
  //         tags: debouncedTags,
  //       });
  //       setIsSaving(false);
  //       setRecentlySaved(true);
  //       // Clear "Saved" badge after 2 seconds
  //       timer = setTimeout(() => setRecentlySaved(false), 2000);
  //     } catch (error) {
  //       console.error('Auto-save error:', error);
  //       setIsSaving(false);
  //     }
  //   };
  //
  //   if (debouncedTitle && debouncedContent) {
  //     autoSave();
  //   }
  //   
  //   return () => {
  //     if (timer) clearTimeout(timer);
  //   };
  // }, [debouncedTitle, debouncedContent, debouncedTags, noteId, note, content, updateNote]);

  const handleManualSave = async () => {
    if (!noteId || !content) return;
    
    setIsSaving(true);
    try {
      await updateNote.mutateAsync({
        id: noteId,
        title: title,
        content_rich: content,
        tags: tags,
        visibility: visibility,
      });
      setIsSaving(false);
      setRecentlySaved(true);
      setTimeout(() => setRecentlySaved(false), 2000);
    } catch (error) {
      console.error('Save error:', error);
      setIsSaving(false);
    }
  };

  const handleVisibilityChange = async (newVisibility: 'private' | 'team' | 'office' | 'friend') => {
    setVisibility(newVisibility);
    
    if (noteId) {
      await updateNote.mutateAsync({
        id: noteId,
        visibility: newVisibility,
      });
      
      // Open friend selector if switching to friend visibility
      if (newVisibility === 'friend') {
        setShowFriendSelector(true);
      }
    }
  };

  const handleFriendSharesUpdate = async (friendIds: string[]) => {
    await updateShares(friendIds);
  };

  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleAIContentUpdate = useCallback((newContent: any) => {
    setContent(newContent);
  }, []);

  const handleAIApply = useCallback(async (newContent: any, mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setContent(newContent);
      toast.success('Note replaced with AI suggestion');
    } else {
      // Append mode - merge content
      const merged = {
        type: 'doc',
        content: [
          ...(content?.content || []),
          ...(newContent?.content || []),
        ],
      };
      setContent(merged);
      toast.success('AI suggestion appended to note');
    }
    // Auto-save after applying
    setTimeout(() => handleManualSave(), 500);
  }, [content]);

  const handleArchive = async () => {
    if (!noteId) return;
    try {
      const { archiveNote } = useNotes();
      await archiveNote.mutateAsync(noteId);
      toast.success('Note archived');
      navigate('/notes');
    } catch (error) {
      toast.error('Failed to archive note');
    }
  };

  useNoteKeyboardShortcuts({
    onFocusMode: () => setFocusMode(!focusMode),
    onEscape: () => navigate('/notes'),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading note...</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Note not found</div>
      </div>
    );
  }

  const ActiveUsers = ({ noteId }: { noteId: string }) => {
    const { activeUsers } = useNotePresence(noteId);
    
    if (activeUsers.length === 0) return null;
    
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
        <div className="flex -space-x-2">
          {activeUsers.slice(0, 3).map((user) => (
            <Avatar key={user.id} className="h-7 w-7 border-2 border-background">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {(user.full_name || user.email)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        {activeUsers.length > 3 && (
          <span className="text-xs text-muted-foreground font-medium">
            +{activeUsers.length - 3} viewing
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`container mx-auto px-4 py-8 transition-all ${focusMode ? 'max-w-4xl' : 'max-w-6xl'}`}>
      {/* Simplified Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/notes')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <ActiveUsers noteId={noteId!} />
        </div>

        <div className="flex gap-2 items-center">
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setShowAIPanel(!showAIPanel)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            AI Assistant
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManualSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : recentlySaved ? 'Saved' : 'Save'}
          </Button>
          
          <NoteVisibilitySelector
            value={visibility}
            onChange={handleVisibilityChange}
            disabled={isSaving}
          />
          {visibility === 'friend' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFriendSelector(true)}
            >
              {shares.length > 0 ? `${shares.length} friend${shares.length !== 1 ? 's' : ''}` : 'Select friends'}
            </Button>
          )}
          
          <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
            <Share2 className="h-4 w-4" />
          </Button>
          
          <NoteActionsMenu
            noteId={noteId!}
            onAIContentUpdate={handleAIContentUpdate}
            onSaveTemplate={() => setShowSaveTemplateDialog(true)}
            onArchive={handleArchive}
            title={title}
            content={content}
          />
          
          <Button variant="ghost" size="sm" onClick={() => setFocusMode(!focusMode)}>
            {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className={`grid ${focusMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[1fr,280px]'} gap-6`}>
        {/* Editor */}
        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Note"
            className="w-full text-4xl font-bold border-none focus-visible:ring-0 px-0 bg-transparent placeholder:text-muted-foreground/40"
          />

          {content && noteId && (
            <RichTextEditor
              content={content}
              onChange={setContent}
              noteId={noteId}
              placeholder="Start writing..."
            />
          )}
        </div>

        {/* Right Sidebar */}
        {!focusMode && (
          <div className="space-y-4">
            <Card className="border-l-4 border-l-primary/30">
              <Tabs defaultValue={showAIPanel ? "ai" : "comments"} value={showAIPanel ? "ai" : undefined} className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="ai" onClick={() => setShowAIPanel(true)}>
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </TabsTrigger>
                  <TabsTrigger value="comments" onClick={() => setShowAIPanel(false)}>
                    Comments
                  </TabsTrigger>
                  <TabsTrigger value="info" onClick={() => setShowAIPanel(false)}>Info</TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="space-y-4">
                  {noteId && content && (
                    <AIAssistantPanel
                      noteId={noteId}
                      currentContent={content}
                      onApply={handleAIApply}
                    />
                  )}
                </TabsContent>

                <TabsContent value="comments" className="space-y-4 mt-4 px-4 pb-4">
                  {noteId && <NoteCommentBox noteId={noteId} />}
                </TabsContent>

                <TabsContent value="info" className="space-y-4 mt-4 px-4 pb-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Owner</h3>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={note.owner_profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(note.owner_profile?.full_name || note.owner_profile?.email || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {note.owner_profile?.full_name || note.owner_profile?.email || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">Tags</h3>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="Add a tag..."
                          className="flex-1"
                        />
                        <Button onClick={handleAddTag} size="sm" variant="outline">
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium mb-2">Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span>{new Date(note.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Updated</span>
                        <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        )}
      </div>

      {noteId && (
        <>
          <ShareNoteDialog
            noteId={noteId}
            open={showShareDialog}
            onOpenChange={setShowShareDialog}
          />
          <SaveTemplateDialog
            open={showSaveTemplateDialog}
            onOpenChange={setShowSaveTemplateDialog}
            noteTitle={title}
            noteContent={content}
          />
          <NoteFriendSelector
            noteId={noteId}
            open={showFriendSelector}
            onOpenChange={setShowFriendSelector}
            onSave={handleFriendSharesUpdate}
          />
        </>
      )}
    </div>
  );
};

export default NoteEditor;
