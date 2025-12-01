import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MODULE_COLORS, ModuleCategoryColor } from "@/lib/moduleColors";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LibraryGridCardProps {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  colorTheme: ModuleCategoryColor;
  playbookCount: number;
}

export function LibraryGridCard({ 
  id, 
  name, 
  description, 
  icon, 
  colorTheme,
  playbookCount 
}: LibraryGridCardProps) {
  const navigate = useNavigate();
  const colors = MODULE_COLORS[colorTheme] || MODULE_COLORS.performance;

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-300 group",
        "border-l-4"
      )}
      style={{ borderLeftColor: colors.primary }}
      onClick={() => navigate(`/knowledge-base/library/${id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div 
            className={cn("p-3 rounded-lg text-2xl shrink-0", colors.gradient)}
          >
            {icon || "📚"}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl line-clamp-1 group-hover:text-primary transition-colors">
              {name}
            </CardTitle>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <BookOpen className="h-3 w-3" />
              <span>{playbookCount} playbook{playbookCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      {description && (
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
