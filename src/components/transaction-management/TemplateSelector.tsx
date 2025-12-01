import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, ChevronDown } from 'lucide-react';
import { useTransactionTemplates, TransactionStage } from '@/hooks/useTransactionTemplates';

interface TemplateSelectorProps {
  stage: TransactionStage;
  transactionId: string;
}

export const TemplateSelector = ({ stage, transactionId }: TemplateSelectorProps) => {
  const { templates, isLoading, applyTemplate } = useTransactionTemplates(stage);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const groupedTemplates = useMemo(() => {
    const system = templates.filter(t => t.is_system_template);
    const userCreated = templates.filter(t => !t.is_system_template);
    return { system, userCreated };
  }, [templates]);

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setShowConfirm(true);
  };

  const handleConfirmApply = async () => {
    if (!selectedTemplate) return;
    
    await applyTemplate.mutateAsync({
      templateId: selectedTemplate.id,
      transactionId,
    });
    
    setShowConfirm(false);
    setSelectedTemplate(null);
  };

  if (isLoading || templates.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Apply Template
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[320px]">
          {groupedTemplates.system.length > 0 && (
            <>
              <DropdownMenuLabel>System Templates</DropdownMenuLabel>
              {groupedTemplates.system.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="flex-col items-start py-3"
                >
                  <div className="flex items-center w-full">
                    <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{template.name}</span>
                        <Badge variant="secondary" className="text-xs">System</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {template.tasks.length} tasks · {template.documents.length} docs
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
              {groupedTemplates.userCreated.length > 0 && <DropdownMenuSeparator />}
            </>
          )}
          
          {groupedTemplates.userCreated.length > 0 && (
            <>
              <DropdownMenuLabel>Custom Templates</DropdownMenuLabel>
              {groupedTemplates.userCreated.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="flex-col items-start py-3"
                >
                  <div className="flex items-center w-full">
                    <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium truncate">{template.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {template.tasks.length} tasks · {template.documents.length} docs
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          
          {templates.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No templates available for this stage
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add <strong>{selectedTemplate?.tasks.length || 0} tasks</strong> and{' '}
              <strong>{selectedTemplate?.documents.length || 0} documents</strong> to this transaction.
              {selectedTemplate?.description && (
                <div className="mt-2 text-sm">
                  {selectedTemplate.description}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApply}>
              Apply Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
