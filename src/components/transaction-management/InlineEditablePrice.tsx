import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineEditablePriceProps {
  label: string;
  value?: number;
  onSave: (value: number) => Promise<void>;
  className?: string;
}

export function InlineEditablePrice({
  label,
  value,
  onSave,
  className,
}: InlineEditablePriceProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setInputValue(value?.toString() || '');
  }, [value]);

  const handleSave = async () => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue) || numValue <= 0) {
      setInputValue(value?.toString() || '');
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(numValue);
      setIsEditing(false);
    } catch (error) {
      setInputValue(value?.toString() || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setInputValue(value?.toString() || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            className="pl-7"
            disabled={isSaving}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center group">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
      <div 
        className="text-lg font-medium cursor-pointer hover:bg-accent/50 rounded px-2 py-1 -mx-2 transition-colors"
        onClick={() => setIsEditing(true)}
      >
        {value ? `$${value.toLocaleString()}` : '-'}
      </div>
    </div>
  );
}
