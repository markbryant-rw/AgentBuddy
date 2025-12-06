import { useState, useMemo, useRef } from 'react';
import { useTransactionDocuments, TransactionDocument } from '@/hooks/useTransactionDocuments';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  Clock, 
  Eye,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Paperclip,
  Download,
  Trash2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTeam } from '@/hooks/useTeam';

interface TransactionDocumentsTabProps {
  transactionId: string;
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground', icon: Clock },
  received: { label: 'Received', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: FileText },
  reviewed: { label: 'Reviewed', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: CheckCircle2 },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const TransactionDocumentsTab = ({ transactionId }: TransactionDocumentsTabProps) => {
  const { documents, isLoading, progress, updateDocument, createDocument } = useTransactionDocuments(transactionId);
  const { team } = useTeam();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['all']));
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocRequired, setNewDocRequired] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const handleAddDocument = () => {
    if (!newDocTitle.trim()) return;
    
    createDocument.mutate({
      transaction_id: transactionId,
      title: newDocTitle.trim(),
      required: newDocRequired,
      status: 'pending',
      section: 'General',
      assignees: [],
      attachments: [],
      order_index: documents.length,
    });
    
    setNewDocTitle('');
    setNewDocRequired(false);
    setIsAddingDocument(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddDocument();
    } else if (e.key === 'Escape') {
      setIsAddingDocument(false);
      setNewDocTitle('');
      setNewDocRequired(false);
    }
  };

  const handleFileUpload = async (docId: string, file: File) => {
    if (!team?.id) {
      toast.error('No team context found');
      return;
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('File type not allowed. Please upload PDF, Word, or image files.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setUploadingDocId(docId);

    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${team.id}/${transactionId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('transaction-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('transaction-documents')
        .getPublicUrl(filePath);

      // Find current document and update attachments
      const doc = documents.find(d => d.id === docId);
      const currentAttachments = doc?.attachments || [];
      
      const newAttachment = {
        url: urlData.publicUrl,
        name: file.name,
        type: file.type,
      };

      // Update document with new attachment and set status to received
      updateDocument.mutate({
        id: docId,
        updates: {
          attachments: [...currentAttachments, newAttachment],
          status: doc?.status === 'pending' ? 'received' : doc?.status,
        },
      });

      toast.success('File uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleFileSelect = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(docId, file);
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const handleRemoveAttachment = async (docId: string, attachmentIndex: number) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    const attachment = doc.attachments[attachmentIndex];
    
    try {
      // Extract file path from URL and delete from storage
      const urlParts = attachment.url.split('/');
      const filePath = urlParts.slice(-3).join('/'); // team_id/transaction_id/filename
      
      await supabase.storage
        .from('transaction-documents')
        .remove([filePath]);

      // Update document attachments
      const updatedAttachments = doc.attachments.filter((_, i) => i !== attachmentIndex);
      
      updateDocument.mutate({
        id: docId,
        updates: {
          attachments: updatedAttachments,
          // Reset status to pending if no attachments left
          status: updatedAttachments.length === 0 ? 'pending' : doc.status,
        },
      });

      toast.success('Attachment removed');
    } catch (error: any) {
      console.error('Remove error:', error);
      toast.error('Failed to remove attachment');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading documents...</div>;
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
          {!isAddingDocument && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddingDocument(true)}
              className="text-primary hover:text-primary"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Document
            </Button>
          )}
        </div>

        {documents.length > 0 && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            {progress === 100 && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                All documents reviewed!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Document Inline Form */}
      {isAddingDocument && (
        <div className="p-4 border-b bg-muted/30">
          <div className="space-y-3">
            <Input
              placeholder="Document name..."
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="bg-background"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={newDocRequired}
                  onCheckedChange={(checked) => setNewDocRequired(checked as boolean)}
                />
                <span>Required document</span>
              </label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingDocument(false);
                    setNewDocTitle('');
                    setNewDocRequired(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddDocument}
                  disabled={!newDocTitle.trim() || createDocument.isPending}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {documents.length === 0 && !isAddingDocument && (
        <div className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">No documents yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add documents to track for this transaction
          </p>
          <Button variant="outline" onClick={() => setIsAddingDocument(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>
      )}

      {/* Document List */}
      {documents.length > 0 && (
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
                      const isUploading = uploadingDocId === doc.id;
                      
                      return (
                        <div
                          key={doc.id}
                          className={cn(
                            "p-3 rounded-lg border transition-colors",
                            doc.status === 'reviewed' && "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
                            doc.status === 'received' && "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
                            doc.status === 'pending' && "bg-background border-border"
                          )}
                        >
                          {/* Document header row */}
                          <div className="flex items-center gap-3">
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

                            {/* Hidden file input */}
                            <input
                              type="file"
                              ref={el => fileInputRefs.current[doc.id] = el}
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                              onChange={(e) => handleFileSelect(doc.id, e)}
                            />

                            {/* Upload button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => fileInputRefs.current[doc.id]?.click()}
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          {/* Attachments list */}
                          {doc.attachments && doc.attachments.length > 0 && (
                            <div className="mt-3 pl-8 space-y-1.5">
                              {doc.attachments.map((attachment, index) => (
                                <div
                                  key={`${attachment.name}-${index}`}
                                  className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1.5 group"
                                >
                                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate flex-1 text-muted-foreground">
                                    {attachment.name}
                                  </span>
                                  <a
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveAttachment(doc.id, index)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
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
      )}
    </div>
  );
};
