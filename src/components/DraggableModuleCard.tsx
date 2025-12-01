import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ModuleCard } from './ModuleCard';
import { LucideIcon, GripVertical } from 'lucide-react';
import { ModuleId } from '@/hooks/useModuleAccess';
import { ModuleCategoryColor } from '@/lib/moduleColors';
import { cn } from '@/lib/utils';

interface DraggableModuleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  route: string;
  moduleId: ModuleId;
  available?: boolean;
  categoryColor?: ModuleCategoryColor;
}

export const DraggableModuleCard = ({
  icon,
  title,
  description,
  route,
  moduleId,
  available = true,
  categoryColor,
}: DraggableModuleCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: moduleId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group cursor-grab active:cursor-grabbing',
        isDragging && 'z-50 opacity-50'
      )}
      {...attributes}
      {...listeners}
    >
      <div className="absolute top-2 right-2 z-10 p-1 bg-background/80 backdrop-blur-sm rounded border opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <ModuleCard
        icon={icon}
        title={title}
        description={description}
        route={route}
        moduleId={moduleId}
        available={available}
        categoryColor={categoryColor}
      />
    </div>
  );
};
