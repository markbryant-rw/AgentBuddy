import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface TransactionDocument {
  title: string;
  required: boolean;
}

interface DocumentBuilderProps {
  documents: TransactionDocument[];
  onDocumentsChange: (documents: TransactionDocument[]) => void;
}

function SortableDocument({ 
  document, 
  index, 
  onUpdate, 
  onRemove 
}: { 
  document: TransactionDocument; 
  index: number; 
  onUpdate: (index: number, field: keyof TransactionDocument, value: any) => void;
  onRemove: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `doc-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-card border rounded-lg hover:border-primary/50 transition-colors">
      <div className="flex items-center gap-2 p-2">
        {/* Drag Handle */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Title Input */}
        <div className="flex-1">
          <Input
            value={document.title}
            onChange={(e) => onUpdate(index, 'title', e.target.value)}
            placeholder="Document title..."
            className="h-9 border-0 shadow-none focus-visible:ring-1"
            required
          />
        </div>

        {/* Required Toggle */}
        <div className="flex items-center gap-2 px-2">
          <Switch
            id={`doc-required-${index}`}
            checked={document.required}
            onCheckedChange={(checked) => onUpdate(index, 'required', checked)}
            className="scale-90"
          />
          <Label htmlFor={`doc-required-${index}`} className="text-xs font-medium cursor-pointer whitespace-nowrap">
            Required
          </Label>
        </div>

        {/* Delete Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function DocumentBuilder({ documents, onDocumentsChange }: DocumentBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addDocument = () => {
    onDocumentsChange([
      ...documents,
      { title: '', required: false },
    ]);
  };

  const removeDocument = (index: number) => {
    onDocumentsChange(documents.filter((_, i) => i !== index));
  };

  const updateDocument = (index: number, field: keyof TransactionDocument, value: any) => {
    const updated = [...documents];
    updated[index] = { ...updated[index], [field]: value };
    onDocumentsChange(updated);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = parseInt(active.id.split('-')[1]);
      const newIndex = parseInt(over.id.split('-')[1]);
      onDocumentsChange(arrayMove(documents, oldIndex, newIndex));
    }
  };

  const requiredCount = documents.filter(d => d.required).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Documents</h3>
          <Badge variant="secondary">{documents.length} total</Badge>
          {requiredCount > 0 && (
            <Badge variant="destructive">{requiredCount} required</Badge>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addDocument}>
          <Plus className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">No documents yet</p>
          <Button type="button" variant="outline" size="sm" onClick={addDocument}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Document
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={documents.map((_, index) => `doc-${index}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {documents.map((doc, index) => (
                <SortableDocument
                  key={`doc-${index}`}
                  document={doc}
                  index={index}
                  onUpdate={updateDocument}
                  onRemove={removeDocument}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
