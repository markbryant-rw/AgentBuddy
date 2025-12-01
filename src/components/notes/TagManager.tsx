import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useTagLibrary, TagLibraryItem } from "@/hooks/useTagLibrary";
import { useTeam } from "@/hooks/useTeam";

interface TagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = ["Clients", "Properties", "Meetings", "Tasks", "Ideas", "Research", "System"];
const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#14b8a6", "#f97316", "#eab308", "#84cc16"
];
const COMMON_ICONS = ["Users", "Home", "Clock", "Star", "FileText", "CheckSquare", "Lightbulb", "Target", "Search", "Sparkles"];

export const TagManager = ({ open, onOpenChange }: TagManagerProps) => {
  const { team } = useTeam();
  const { tags, createTag, updateTag, deleteTag } = useTagLibrary();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState({
    name: "",
    color: "#6366f1",
    icon: "Tag",
    category: "Tasks",
  });

  const handleCreate = async () => {
    if (!team?.id || !newTag.name) return;
    
    await createTag.mutateAsync({
      team_id: team.id,
      ...newTag,
    });
    
    setNewTag({
      name: "",
      color: "#6366f1",
      icon: "Tag",
      category: "Tasks",
    });
  };

  const handleUpdate = async (tag: TagLibraryItem) => {
    await updateTag.mutateAsync(tag);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this tag?")) {
      await deleteTag.mutateAsync(id);
    }
  };

  const groupedTags = tags.reduce((acc, tag) => {
    const cat = tag.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tag);
    return acc;
  }, {} as Record<string, TagLibraryItem[]>);

  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Tag Library</DialogTitle>
          <DialogDescription>
            Create and manage tags for your team. Tags help organize and categorize notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Tag */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <h3 className="font-semibold text-sm">Create New Tag</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newTag.name}
                  onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                  placeholder="e.g., Important Client"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newTag.category} onValueChange={(v) => setNewTag({ ...newTag, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        newTag.color === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTag({ ...newTag, color })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>Icon</Label>
                <Select value={newTag.icon} onValueChange={(v) => setNewTag({ ...newTag, icon: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_ICONS.map(icon => {
                      const Icon = (LucideIcons as any)[icon];
                      return (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className="h-4 w-4" />}
                            {icon}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!newTag.name}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tag
            </Button>
          </div>

          {/* Existing Tags */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedTags).map(([category, categoryTags]) => (
                <div key={category}>
                  <h4 className="font-semibold text-sm mb-3 text-muted-foreground">{category}</h4>
                  <div className="space-y-2">
                    {categoryTags.map(tag => (
                      <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Badge 
                            style={{ backgroundColor: tag.color }}
                            className="text-white border-0"
                          >
                            {getIcon(tag.icon)}
                            <span className="ml-1.5">{tag.name}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Used {tag.usage_count} times
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {tag.usage_count === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(tag.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
