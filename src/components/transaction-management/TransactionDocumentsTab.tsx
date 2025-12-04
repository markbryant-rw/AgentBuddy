import { useState, useMemo } from 'react';
import { useTransactionDocuments, TransactionDocument } from '@/hooks/useTransactionDocuments';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  Clock, 
  Eye,
  ChevronDown,
  ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface TransactionDocumentsTabProps {
  transactionId: string;
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground', icon: Clock },
  received: { label: 'Received', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: FileText },
  reviewed: { label: 'Reviewed', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: CheckCircle2 },
};

export const TransactionDocumentsTab = ({ transactionId }: TransactionDocumentsTabProps) => {
  const { documents, isLoading, progress, updateDocument } = useTransactionDocuments(transactionId);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['all']));

  const documentsBySection = useMemo(() => {
    const sections: Record<string, TransactionDocument[]> = {};
    
    documents.forEach(doc => {
      const section = doc.section || 'General';
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(doc);
    });

    return sections;
  }, [documents]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleStatusChange = (docId: string, currentStatus: TransactionDocument['status']) => {
    const nextStatus: TransactionDocument['status'] = 
      currentStatus === 'pending' ? 'received' : 
      currentStatus === 'received' ? 'reviewed' : 'pending';
    
    updateDocument.mutate({ id: docId, updates: { status: nextStatus } });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading documents...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-2">No documents yet</p>
        <p className="text-sm text-muted-foreground">
          Apply a template to add document checklists for this transaction
        </p>
      </div>
    );
  }

  const reviewedCount = documents.filter(d => d.status === 'reviewed').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {reviewedCount} of {documents.length} documents reviewed
          </div>
        </div>

        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          {progress === 100 && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              All documents reviewed!
            </div>
          )}
        </div>
      </div>

      {/* Document List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {Object.entries(documentsBySection).map(([section, sectionDocs]) => {
            const isExpanded = expandedSections.has(section) || expandedSections.has('all');
            const sectionReviewedCount = sectionDocs.filter(d => d.status === 'reviewed').length;

            return (
              <Collapsible
                key={section}
                open={isExpanded}
                onOpenChange={() => toggleSection(section)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-semibold text-sm uppercase tracking-wide">
                      {section}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {sectionReviewedCount}/{sectionDocs.length}
                  </span>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-2 space-y-2">
                  {sectionDocs.map(doc => {
                    const StatusIcon = STATUS_CONFIG[doc.status].icon;
                    
                    return (
                      <div
                        key={doc.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          doc.status === 'reviewed' && "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
                          doc.status === 'received' && "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
                          doc.status === 'pending' && "bg-background border-border"
                        )}
                      >
                        <Checkbox
                          checked={doc.status === 'reviewed'}
                          onCheckedChange={() => handleStatusChange(doc.id, doc.status)}
                          className="h-5 w-5"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-medium text-sm",
                              doc.status === 'reviewed' && "line-through text-muted-foreground"
                            )}>
                              {doc.title}
                            </span>
                            {doc.required && (
                              <Badge variant="outline" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>

                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", STATUS_CONFIG[doc.status].color)}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STATUS_CONFIG[doc.status].label}
                        </Badge>

                        {doc.attachments && doc.attachments.length > 0 && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
