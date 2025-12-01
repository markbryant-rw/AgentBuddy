import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULE_COLORS, ModuleCategoryColor } from "@/lib/moduleColors";

interface EnhancedCardProps {
  category: ModuleCategoryColor;
  icon: LucideIcon;
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
  className?: string;
}

export const EnhancedCard = ({ 
  category, 
  icon: Icon, 
  title, 
  action, 
  children, 
  className 
}: EnhancedCardProps) => {
  const colors = MODULE_COLORS[category];
  
  return (
    <Card className={cn(
      "group hover:shadow-xl transition-all duration-300 border-l-4",
      colors.border,
      className
    )}>
      <CardHeader className={cn(
        "bg-gradient-to-r to-transparent",
        colors.bg
      )}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", colors.iconBg)}>
              <Icon className={cn("h-5 w-5", colors.text)} />
            </div>
            {title}
          </CardTitle>
          {action && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={action.onClick} 
              className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {children}
      </CardContent>
    </Card>
  );
};
