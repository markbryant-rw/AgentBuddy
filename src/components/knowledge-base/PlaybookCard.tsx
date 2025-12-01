import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MODULE_COLORS, ModuleCategoryColor } from "@/lib/moduleColors";
import { cn } from "@/lib/utils";
import { Clock, FileText, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Playbook {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  estimated_minutes: number | null;
  card_count?: number;
  completion_rate?: number;
}

interface PlaybookCardProps {
  playbook: Playbook;
  colorTheme: ModuleCategoryColor;
}

export function PlaybookCard({ playbook, colorTheme }: PlaybookCardProps) {
  const navigate = useNavigate();
  const colors = MODULE_COLORS[colorTheme] || MODULE_COLORS.performance;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 group overflow-hidden"
      onClick={() => navigate(`/knowledge-base/${playbook.id}`)}
    >
      {playbook.cover_image && (
        <div className="aspect-video overflow-hidden bg-muted">
          <img 
            src={playbook.cover_image} 
            alt={playbook.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {playbook.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {playbook.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {playbook.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {playbook.card_count !== undefined && (
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{playbook.card_count} cards</span>
            </div>
          )}
          {playbook.estimated_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{playbook.estimated_minutes} min</span>
            </div>
          )}
        </div>

        {playbook.completion_rate !== undefined && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-500", colors.gradient)}
                style={{ width: `${playbook.completion_rate}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {playbook.completion_rate}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
