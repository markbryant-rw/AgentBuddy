import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, CheckCircle, X, Save } from 'lucide-react';
import { CardRenderer } from './CardRenderer';
import { CardEditor } from './editors/CardEditor';
import { CardSidebar } from './CardSidebar';
import { useCardProgress } from '@/hooks/useCardProgress';
import { useCardEditor } from '@/hooks/useCardEditor';
import { cn } from '@/lib/utils';

interface PlaybookViewerProps {
  cards: any[];
  playbookId: string;
  canEdit: boolean;
}

export function PlaybookViewer({ cards, playbookId, canEdit }: PlaybookViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editMinutes, setEditMinutes] = useState<number | undefined>(undefined);
  const [editContent, setEditContent] = useState<any>(null);
  
  const currentCard = cards[currentIndex];
  const { progress, markViewed, markComplete } = useCardProgress(currentCard?.id);
  const { createCard, updateCard, isCreating, isUpdating } = useCardEditor(playbookId);

  // Mark card as viewed when it's displayed
  useEffect(() => {
    if (currentCard?.id) {
      markViewed();
    }
  }, [currentCard?.id]);

  const goToNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleCardSelect = (index: number) => {
    setCurrentIndex(index);
  };

  const toggleComplete = () => {
    markComplete(!progress?.completed);
  };

  const startEditing = () => {
    if (currentCard) {
      setEditTitle(currentCard.title);
      setEditMinutes(currentCard.estimated_minutes || undefined);
      setEditContent(currentCard.content || { type: 'doc', content: [{ type: 'paragraph' }] });
      setIsEditing(true);
      
      // Smooth scroll to top for full-screen editing experience
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditMinutes(undefined);
    setEditContent(null);
  };

  const saveEditing = () => {
    if (!currentCard || !editTitle.trim()) return;

    updateCard({
      id: currentCard.id,
      title: editTitle,
      estimated_minutes: editMinutes,
      content: editContent,
    });

    setIsEditing(false);
  };

  const handleAddChapter = () => {
    const nextCardNumber = Math.max(...cards.map(c => c.card_number), 0) + 1;
    
    createCard({
      title: 'New Chapter',
      card_number: nextCardNumber,
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      estimated_minutes: 10,
    });
  };

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No cards available</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex border rounded-lg overflow-hidden bg-card",
      isEditing ? "min-h-screen" : "h-[calc(100vh-12rem)]"
    )}>
      {/* Sidebar - Hidden completely during editing for focus */}
      {!isEditing && (
        <CardSidebar
          cards={cards}
          currentCardIndex={currentIndex}
          onCardSelect={handleCardSelect}
          onEditChapter={startEditing}
          onAddChapter={handleAddChapter}
          canEdit={canEdit}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>Card {currentCard.card_number} of {cards.length}</span>
                {currentCard.estimated_minutes && (
                  <>
                    <span>•</span>
                    <span>{currentCard.estimated_minutes} min</span>
                  </>
                )}
              </div>
              <h2 className="text-2xl font-bold">{currentCard.title}</h2>
            </div>
            
            {!isEditing && (
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditing}
                    className="gap-2"
                  >
                    Edit Chapter
                  </Button>
                )}
                <Button
                  variant={progress?.completed ? "default" : "outline"}
                  size="sm"
                  onClick={toggleComplete}
                  className="gap-2"
                >
                  <CheckCircle className={cn(
                    "h-4 w-4",
                    progress?.completed && "fill-current"
                  )} />
                  {progress?.completed ? 'Completed' : 'Mark Complete'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Card content - scrollable */}
        <div className="flex-1 overflow-y-auto">
          {isEditing ? (
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Chapter Title</Label>
                <Input
                  id="title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter chapter title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minutes">Estimated Minutes</Label>
                <Input
                  id="minutes"
                  type="number"
                  value={editMinutes || ''}
                  onChange={(e) => setEditMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g., 10"
                />
              </div>

              <div className="space-y-2">
                <Label>Content</Label>
                <CardEditor
                  content={editContent}
                  onChange={setEditContent}
                />
              </div>
            </div>
          ) : (
            <CardRenderer card={currentCard} />
          )}
        </div>

        {/* Navigation footer - sticky at bottom */}
        <div className="p-4 border-t flex items-center justify-between bg-background sticky bottom-0 z-10 flex-shrink-0">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={cancelEditing}
                disabled={isUpdating}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              
              <div className="text-sm text-muted-foreground">
                Editing Chapter
              </div>
              
              <Button
                onClick={saveEditing}
                disabled={isUpdating || !editTitle.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <div className="text-sm text-muted-foreground">
                {currentIndex + 1} / {cards.length}
              </div>
              
              <Button
                onClick={goToNext}
                disabled={currentIndex === cards.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
