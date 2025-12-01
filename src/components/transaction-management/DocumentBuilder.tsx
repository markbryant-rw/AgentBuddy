import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface TransactionDocument {
  title: string;
  section: string;
  required: boolean;
}

interface DocumentBuilderProps {
  documents: TransactionDocument[];
  onDocumentsChange: (documents: TransactionDocument[]) => void;
}

const DOCUMENT_SECTIONS = [
  'GETTING STARTED',
  'MARKETING',
  'LEGAL',
  'FINANCE',
  'DUE DILIGENCE',
  'SETTLEMENT',
  'HANDOVER',
  'CLIENT CARE',
  'ADMIN',
  'COMPLIANCE',
  'STRATA',
  'PLANNING',
  'PRICING',
  'VIEWINGS',
  'PROSPECTING',
  'TRACKING',
  'PREPARATION',
  'FOLLOW UP',
  'SCHEDULING',
  'SETUP',
  'COMMUNICATION',
  'REPORTING',
  'FINANCIAL',
];

const SECTION_COLORS: Record<string, string> = {
  'GETTING STARTED': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'MARKETING': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  'LEGAL': 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  'FINANCE': 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  'DUE DILIGENCE': 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  'SETTLEMENT': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  'HANDOVER': 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  'CLIENT CARE': 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  'ADMIN': 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
  'COMPLIANCE': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
};

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

        {/* Title Input - 50% */}
        <div className="flex-[2]">
          <Input
            value={document.title}
            onChange={(e) => onUpdate(index, 'title', e.target.value)}
            placeholder="Document title..."
            className="h-9 border-0 shadow-none focus-visible:ring-1"
            required
          />
        </div>

        {/* Section Dropdown - 30% */}
        <div className="flex-1">
          <Select value={document.section} onValueChange={(value) => onUpdate(index, 'section', value)}>
            <SelectTrigger className="h-9 border-0 shadow-none focus:ring-1">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_SECTIONS.map((section) => (
                <SelectItem key={section} value={section}>
                  {section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Required Toggle - 15% */}
        <div className="flex items-center gap-2 px-2">
          <Switch
            id={`doc-required-${index}`}
            checked={document.required}
            onCheckedChange={(checked) => onUpdate(index, 'required', checked)}
            className="scale-90"
          />
          <Label htmlFor={`doc-required-${index}`} className="text-xs font-medium cursor-pointer whitespace-nowrap">
            Req
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
      { title: '', section: 'LEGAL', required: false },
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

  // Group documents by section for visual reference
  const docsBySection = documents.reduce((acc, doc) => {
    acc[doc.section] = (acc[doc.section] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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

      {Object.keys(docsBySection).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(docsBySection).map(([section, count]) => (
            <Badge 
              key={section} 
              variant="outline"
              className={SECTION_COLORS[section] || 'bg-secondary'}
            >
              {section}: {count}
            </Badge>
          ))}
        </div>
      )}

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
