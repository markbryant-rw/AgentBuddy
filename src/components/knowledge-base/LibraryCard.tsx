import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaybookCard } from "./PlaybookCard";
import { MODULE_COLORS, ModuleCategoryColor } from "@/lib/moduleColors";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color_theme: string;
  icon: string | null;
  playbooks?: Playbook[];
}

interface Playbook {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  estimated_minutes: number | null;
  card_count?: number;
  completion_rate?: number;
}

interface LibraryCardProps {
  category: Category;
}

export function LibraryCard({ category }: LibraryCardProps) {
  const colorTheme = (category.color_theme || 'systems') as ModuleCategoryColor;
  const colors = MODULE_COLORS[colorTheme] || MODULE_COLORS.systems;
  const playbooks = category.playbooks || [];

  return (
    <Card className={cn(
      "border-l-4 transition-all duration-300",
      colors.border
    )}>
      <CardHeader className={cn(
        "bg-gradient-to-r to-transparent",
        colors.bg
      )}>
        <CardTitle className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", colors.iconBg)}>
            {category.icon ? (
              <span className="text-2xl">{category.icon}</span>
            ) : (
              <BookOpen className={cn("h-5 w-5", colors.text)} />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold">{category.name}</h3>
            {category.description && (
              <p className="text-sm text-muted-foreground font-normal mt-1">
                {category.description}
              </p>
            )}
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            {playbooks.length} {playbooks.length === 1 ? 'playbook' : 'playbooks'}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {playbooks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {playbooks.map((playbook) => (
              <PlaybookCard 
                key={playbook.id} 
                playbook={playbook}
                colorTheme={colorTheme}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No playbooks in this library yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
