import { useState, useRef, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddPlannerItemProps {
  onAdd: (title: string, sizeCategory: 'big' | 'medium' | 'little') => void;
  placeholder?: string;
}

export function AddPlannerItem({ onAdd, placeholder = "Add a task..." }: AddPlannerItemProps) {
  const [value, setValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'big' | 'medium' | 'little'>('medium');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      onAdd(value.trim(), selectedCategory);
      setValue('');
    }
  };

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim(), selectedCategory);
      setValue('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          variant={selectedCategory === 'big' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('big')}
          className={cn(
            "gap-1",
            selectedCategory === 'big' && "bg-blue-500 hover:bg-blue-600"
          )}
        >
          📌 Big
        </Button>
        <Button
          variant={selectedCategory === 'medium' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('medium')}
          className={cn(
            "gap-1",
            selectedCategory === 'medium' && "bg-amber-500 hover:bg-amber-600"
          )}
        >
          📊 Medium
        </Button>
        <Button
          variant={selectedCategory === 'little' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('little')}
          className={cn(
            "gap-1",
            selectedCategory === 'little' && "bg-green-500 hover:bg-green-600"
          )}
        >
          ⚡ Quick
        </Button>
      </div>

      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-10 bg-muted/50 border-dashed hover:border-primary/50 focus:border-primary transition-all"
          />
        </div>
        <Button onClick={handleAdd} size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
