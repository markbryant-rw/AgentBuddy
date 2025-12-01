import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AddPlaybookCardProps {
  libraryId: string;
}

export function AddPlaybookCard({ libraryId }: AddPlaybookCardProps) {
  const navigate = useNavigate();

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 group border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/50 flex items-center justify-center min-h-[240px]"
      onClick={() => navigate(`/knowledge-base/new?library=${libraryId}`)}
    >
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="p-3 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors">
          <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div>
          <p className="font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
            Create Playbook
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Add a new playbook to this library
          </p>
        </div>
      </div>
    </Card>
  );
}
