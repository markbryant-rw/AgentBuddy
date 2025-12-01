import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ListingCard } from './ListingCard';
import { Listing } from '@/hooks/useListingPipeline';

interface DraggableListingCardProps {
  listing: Listing;
  onClick: () => void;
  onUpdate: (id: string, updates: Partial<Listing>) => void;
  onDelete: (id: string) => void;
}

export const DraggableListingCard = ({
  listing,
  onClick,
  onUpdate,
  onDelete,
}: DraggableListingCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: listing.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    pointerEvents: (isDragging ? 'none' : 'auto') as 'none' | 'auto',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      {...listeners}
      className="relative cursor-grab active:cursor-grabbing"
    >
      <ListingCard
        listing={listing}
        onClick={onClick}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </div>
  );
};
