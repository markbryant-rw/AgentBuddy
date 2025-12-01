import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { LibraryForm } from "./LibraryForm";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";

export function AddLibraryCard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { createLibrary } = useKnowledgeBase();

  const handleSave = (data: any) => {
    setIsSaving(true);
    createLibrary(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setIsSaving(false);
      },
      onError: () => {
        setIsSaving(false);
      },
    });
  };

  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 group border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/50 flex items-center justify-center min-h-[160px]"
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="p-3 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors">
            <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div>
            <p className="font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              Create Library
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Organize your playbooks
            </p>
          </div>
        </div>
      </Card>

      <LibraryForm
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </>
  );
}
