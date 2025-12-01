import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, Trash2, FileText } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Card {
  id: string;
  card_number: number;
  title: string;
  template?: string | null;
  estimated_minutes?: number;
}

interface CardListProps {
  cards: Card[];
  onEdit: (card: Card) => void;
  onDelete: (cardId: string) => void;
  onReorder: (cardUpdates: { id: string; card_number: number }[]) => void;
}

function SortableCard({ card, onEdit, onDelete }: { card: Card; onEdit: () => void; onDelete: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };


  return (
    <Card ref={setNodeRef} style={style} className="mb-2">
      <CardContent className="flex items-center gap-3 p-4">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
          {card.card_number}
        </div>

        <FileText className="h-4 w-4 text-muted-foreground" />

        <div className="flex-1">
          <p className="font-medium">{card.title}</p>
          {card.estimated_minutes && (
            <p className="text-sm text-muted-foreground">{card.estimated_minutes} min</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CardList({ cards, onEdit, onDelete, onReorder }: CardListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = cards.findIndex(c => c.id === active.id);
      const newIndex = cards.findIndex(c => c.id === over.id);
      
      const newCards = arrayMove(cards, oldIndex, newIndex);
      const updates = newCards.map((card, index) => ({
        id: card.id,
        card_number: index + 1
      }));
      
      onReorder(updates);
    }
  };

  if (cards.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No chapters yet. Add your first chapter to get started.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={cards.map(c => c.id)}
        strategy={verticalListSortingStrategy}
      >
        {cards.map((card) => (
          <SortableCard
            key={card.id}
            card={card}
            onEdit={() => onEdit(card)}
            onDelete={() => onDelete(card.id)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
