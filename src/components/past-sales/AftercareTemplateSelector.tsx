import { useState } from "react";
import { Check, ChevronDown, FileText, Heart, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AftercareTemplate } from "@/types/aftercare";

interface AftercareTemplateSelectorProps {
  templates: AftercareTemplate[];
  selectedTemplateId: string | null;
  onSelect: (template: AftercareTemplate) => void;
  saleStatus?: string | null;
}

export function AftercareTemplateSelector({
  templates,
  selectedTemplateId,
  onSelect,
  saleStatus,
}: AftercareTemplateSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  
  // Suggest appropriate template based on sale status
  const isWithdrawn = saleStatus?.toLowerCase().includes('withdrawn');
  const suggestedTemplate = isWithdrawn 
    ? templates.find(t => t.name.toLowerCase().includes('withdrawn'))
    : templates.find(t => t.is_default && t.is_system_template);

  const handleSelect = (template: AftercareTemplate) => {
    onSelect(template);
    setOpen(false);
  };

  const getTemplateIcon = (template: AftercareTemplate) => {
    if (template.name.toLowerCase().includes('withdrawn')) {
      return <RotateCcw className="h-4 w-4 text-amber-500" />;
    }
    if (template.is_evergreen) {
      return <FileText className="h-4 w-4 text-emerald-500" />;
    }
    return <Heart className="h-4 w-4 text-rose-500" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            {selectedTemplate ? (
              <>
                {getTemplateIcon(selectedTemplate)}
                <span>{selectedTemplate.name}</span>
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Select template...</span>
              </>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2 z-[12000]" align="start">
        <div className="space-y-1">
          {isWithdrawn && suggestedTemplate && (
            <div className="px-2 py-1 mb-2">
              <p className="text-xs text-muted-foreground">
                💡 Suggested for withdrawn sales:
              </p>
            </div>
          )}
          
          {templates.map((template) => {
            const isSuggested = template.id === suggestedTemplate?.id;
            
            return (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                className={cn(
                  "w-full flex items-start gap-3 p-2 rounded-md text-left hover:bg-muted transition-colors",
                  selectedTemplateId === template.id && "bg-primary/10",
                  isSuggested && isWithdrawn && "ring-1 ring-amber-300 bg-amber-50 dark:bg-amber-950/20"
                )}
              >
                <div className="mt-0.5">
                  {getTemplateIcon(template)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{template.name}</span>
                    {template.is_system_template && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        System
                      </Badge>
                    )}
                    {isSuggested && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-300 text-amber-600">
                        Suggested
                      </Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {template.tasks.length} tasks
                  </p>
                </div>
                {selectedTemplateId === template.id && (
                  <Check className="h-4 w-4 text-primary mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
