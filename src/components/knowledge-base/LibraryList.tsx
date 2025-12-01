import { useState } from "react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MODULE_COLORS, ModuleCategoryColor } from "@/lib/moduleColors";
import { cn } from "@/lib/utils";
import { GripVertical, Pencil, Trash2, BookOpen } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Library {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color_theme: string;
  sort_order: number;
  playbook_count?: number;
}

interface LibraryListProps {
  libraries: Library[];
  onEdit: (library: Library) => void;
  onDelete: (id: string) => void;
  onReorder: (updates: { id: string; sort_order: number }[]) => void;
}

function SortableLibraryItem({ 
  library, 
  onEdit, 
  onDelete 
}: { 
  library: Library;
  onEdit: (library: Library) => void;
  onDelete: (id: string) => void;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: library.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colors = MODULE_COLORS[library.color_theme as ModuleCategoryColor] || MODULE_COLORS.systems;

  return (
    <>
      <Card ref={setNodeRef} style={style} className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Icon & Preview */}
            <div 
              className={cn("p-2 rounded text-lg shrink-0", colors.gradient)}
            >
              {library.icon || "📚"}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{library.name}</h4>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                {library.description && (
                  <span className="truncate">{library.description}</span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <BookOpen className="h-3 w-3" />
                  <span>{library.playbook_count || 0} playbooks</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(library)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Library?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{library.name}" and all its playbooks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(library.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function LibraryList({ libraries, onEdit, onDelete, onReorder }: LibraryListProps) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = libraries.findIndex(lib => lib.id === active.id);
    const newIndex = libraries.findIndex(lib => lib.id === over.id);

    const reorderedLibraries = [...libraries];
    const [movedItem] = reorderedLibraries.splice(oldIndex, 1);
    reorderedLibraries.splice(newIndex, 0, movedItem);

    // Create updates with new sort_order
    const updates = reorderedLibraries.map((lib, index) => ({
      id: lib.id,
      sort_order: index,
    }));

    onReorder(updates);
  };

  if (libraries.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
        <div>
          <h3 className="text-lg font-semibold">No libraries yet</h3>
          <p className="text-muted-foreground">
            Create your first library to organize playbooks
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={libraries.map(lib => lib.id)} strategy={verticalListSortingStrategy}>
        <div>
          {libraries.map((library) => (
            <SortableLibraryItem
              key={library.id}
              library={library}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
