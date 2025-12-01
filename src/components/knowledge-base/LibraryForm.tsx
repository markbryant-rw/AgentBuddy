import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MODULE_COLORS, ModuleCategoryColor } from "@/lib/moduleColors";
import { cn } from "@/lib/utils";

interface LibraryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  library?: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    color_theme: string;
    sort_order: number;
  };
  onSave: (data: any) => void;
  isSaving: boolean;
}

const COLOR_THEMES = [
  { value: 'systems', label: 'Systems', emoji: '⚙️' },
  { value: 'sales', label: 'Sales', emoji: '💼' },
  { value: 'prospecting', label: 'Prospecting', emoji: '🎯' },
  { value: 'social', label: 'Social', emoji: '📱' },
  { value: 'video', label: 'Video', emoji: '🎥' },
  { value: 'financial', label: 'Financial', emoji: '💰' },
  { value: 'admin', label: 'Admin', emoji: '📋' },
  { value: 'training', label: 'Training', emoji: '📚' },
];

export function LibraryForm({ open, onOpenChange, library, onSave, isSaving }: LibraryFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [colorTheme, setColorTheme] = useState<ModuleCategoryColor>("systems");

  useEffect(() => {
    if (library) {
      setName(library.name);
      setDescription(library.description || "");
      setIcon(library.icon || "");
      setColorTheme(library.color_theme as ModuleCategoryColor);
    } else {
      setName("");
      setDescription("");
      setIcon("");
      setColorTheme("systems");
    }
  }, [library, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: library?.id,
      name,
      description: description || null,
      icon: icon || null,
      color_theme: colorTheme,
      sort_order: library?.sort_order || 0,
    });
  };

  const colors = MODULE_COLORS[colorTheme] || MODULE_COLORS.systems;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{library ? 'Edit Library' : 'Create New Library'}</DialogTitle>
          <DialogDescription>
            {library ? 'Update library details' : 'Add a new library to organize your playbooks'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sales Training"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this library..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icon (Emoji)</Label>
            <Input
              id="icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="📚"
              maxLength={4}
            />
            <p className="text-xs text-muted-foreground">
              Enter an emoji or leave blank for default
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color-theme">Color Theme *</Label>
            <Select value={colorTheme} onValueChange={(value) => setColorTheme(value as ModuleCategoryColor)}>
              <SelectTrigger id="color-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_THEMES.map((theme) => {
                  const themeColors = MODULE_COLORS[theme.value as ModuleCategoryColor] || MODULE_COLORS.systems;
                  return (
                    <SelectItem key={theme.value} value={theme.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className={cn("w-4 h-4 rounded", themeColors.gradient)}
                        />
                        <span>{theme.emoji} {theme.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {/* Preview */}
            <div className="mt-3 p-4 border rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className="flex items-center gap-3">
                <div className={cn("p-3 rounded-lg text-2xl", colors.gradient)}>
                  {icon || "📚"}
                </div>
                <div>
                  <p className="font-semibold">{name || "Library Name"}</p>
                  <p className="text-sm text-muted-foreground">
                    {description || "Library description"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !name}>
              {isSaving ? 'Saving...' : library ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
