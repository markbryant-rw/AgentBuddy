import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleRowProps {
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  label: string;
}

export const CollapsibleRow = ({ 
  isCollapsed, 
  onToggle, 
  children, 
  label 
}: CollapsibleRowProps) => {
  return (
    <div className="space-y-3">
      {/* Row collapse button - prominent and clear */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className="gap-2 hover:bg-accent transition-colors shadow-sm"
        >
          {isCollapsed ? (
            <>
              <ChevronDown className="h-4 w-4" />
              Expand Row
            </>
          ) : (
            <>
              <ChevronUp className="h-4 w-4" />
              Collapse Row
            </>
          )}
        </Button>
      </div>
      
      {/* Module grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {children}
      </div>
    </div>
  );
};
