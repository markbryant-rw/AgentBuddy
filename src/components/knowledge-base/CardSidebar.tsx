import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Plus, Pencil } from "lucide-react";

interface Card {
  id: string;
  card_number: number;
  title: string;
  estimated_minutes: number | null;
  progress?: {
    completed: boolean;
  };
  [key: string]: any; // Allow additional properties
}

interface CardSidebarProps {
  cards: Card[];
  currentCardIndex: number;
  onCardSelect: (index: number) => void;
  onEditChapter?: () => void;
  onAddChapter?: () => void;
  canEdit?: boolean;
}

export function CardSidebar({ cards, currentCardIndex, onCardSelect, onEditChapter, onAddChapter, canEdit }: CardSidebarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">Chapters</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {cards.length} {cards.length === 1 ? 'chapter' : 'chapters'}
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {cards.map((card, index) => {
            const isActive = index === currentCardIndex;
            const isCompleted = card.progress?.completed;
            
            return (
              <div
                key={card.id}
                className="relative group"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <button
                  onClick={() => onCardSelect(index)}
                  className={cn(
                    "w-full text-left p-2 rounded-md transition-colors",
                    "hover:bg-accent/50",
                    isActive && "bg-accent"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {isCompleted ? (
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-muted-foreground/30 flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground">{card.card_number}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-xs line-clamp-2",
                        isActive && "text-primary"
                      )}>
                        {card.title}
                      </p>
                      {card.estimated_minutes && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {card.estimated_minutes} min
                        </p>
                      )}
                    </div>
                  </div>
                </button>
                
                {canEdit && hoveredIndex === index && onEditChapter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditChapter();
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-accent transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      {canEdit && onAddChapter && (
        <div className="p-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={onAddChapter}
          >
            <Plus className="h-3 w-3" />
            Add Chapter
          </Button>
        </div>
      )}
    </div>
  );
}
