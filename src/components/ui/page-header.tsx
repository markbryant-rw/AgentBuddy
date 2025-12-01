import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULE_COLORS, ModuleCategoryColor } from "@/lib/moduleColors";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  category: ModuleCategoryColor;
  actions?: React.ReactNode;
}

export const PageHeader = ({ 
  icon: Icon, 
  title, 
  description, 
  category, 
  actions 
}: PageHeaderProps) => {
  const colors = MODULE_COLORS[category];
  
  return (
    <div className={cn(
      "p-6 rounded-xl mb-8 bg-gradient-to-br from-background to-muted/30",
      colors.bg
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("p-3 rounded-xl", colors.iconBg)}>
            <Icon className={cn("h-8 w-8", colors.text)} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        {actions}
      </div>
    </div>
  );
};
