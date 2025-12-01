import { Button } from "@/components/ui/button";
import { Plus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULE_COLORS, ModuleCategoryColor } from "@/lib/moduleColors";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  category?: ModuleCategoryColor;
}

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  category = 'performance' 
}: EmptyStateProps) => {
  const colors = MODULE_COLORS[category];
  
  return (
    <div className="text-center py-16 space-y-4">
      <div className="relative inline-block">
        <Icon className={cn("h-20 w-20 mx-auto animate-bounce", colors.text)} />
        <div className={cn(
          "absolute inset-0 h-20 w-20 mx-auto rounded-full animate-ping opacity-20",
          colors.bg
        )} />
      </div>
      <p className="text-xl font-bold">{title}</p>
      <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
      {action && (
        <Button size="lg" onClick={action.onClick}>
          <Plus className="h-5 w-5 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
};
