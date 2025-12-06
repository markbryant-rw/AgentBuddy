import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Calendar, User, AlertCircle, Trash2, Loader2, UserCheck, CheckCircle2, Archive, ImageOff, Pencil, Check, X as XIcon, Maximize2 } from "lucide-react";
import { format } from "date-fns";
import { AIBugAnalysisPanel } from "./admin/AIBugAnalysisPanel";
import { useBugReports } from "@/hooks/useBugReports";
import { useAuth } from "@/hooks/useAuth";
import { BugReportCommentsSection } from "./BugReportCommentsSection";
import { useBugVotes } from "@/hooks/useBugVotes";
import { cn } from "@/lib/utils";
import { ScreenshotLightbox } from "./ScreenshotLightbox";

interface BugDetailDrawerProps {
  bugId: string;
  open: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export function BugDetailDrawer({ bugId, open, onClose, isAdmin }: BugDetailDrawerProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { deleteBug, isDeleting, markAsFixed, isMarkingFixed, archiveBug, isArchiving } = useBugReports();
  const { hasVoted, toggleVote, isToggling } = useBugVotes(bugId);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Individual editing states for inline editing
  const [editingSummary, setEditingSummary] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingExpectedBehaviour, setEditingExpectedBehaviour] = useState(false);
  const [editingStepsToReproduce, setEditingStepsToReproduce] = useState(false);
  const [editingSeverity, setEditingSeverity] = useState(false);
  const [editingModule, setEditingModule] = useState(false);

  // Field values for editing
  const [summaryValue, setSummaryValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [expectedBehaviourValue, setExpectedBehaviourValue] = useState('');
  const [stepsToReproduceValue, setStepsToReproduceValue] = useState('');
  const [severityValue, setSeverityValue] = useState('');
  const [moduleValue, setModuleValue] = useState('');
  const [statusValue, setStatusValue] = useState('');
  
  // Saving states
  const [savingSummary, setSavingSummary] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [savingExpectedBehaviour, setSavingExpectedBehaviour] = useState(false);
  const [savingStepsToReproduce, setSavingStepsToReproduce] = useState(false);
  const [savingSeverity, setSavingSeverity] = useState(false);
  const [savingModule, setSavingModule] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, user_roles(role, revoked_at)')
        .eq('id', user.id)
        .single();
      console.log('[BugDetailDrawer] Profile data:', data);
      console.log('[BugDetailDrawer] User roles:', data?.user_roles);
      return data;
    },
    enabled: !!user?.id,
  });

  const isPlatformAdmin = (() => {
    const roles = profile?.user_roles;
    if (!roles) return false;
    // Handle both array and single object responses from Supabase
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.some((role: any) => role.role === 'platform_admin' && !role.revoked_at);
  })();

  console.log('[BugDetailDrawer] isPlatformAdmin:', isPlatformAdmin);
  console.log('[BugDetailDrawer] isAdmin prop:', isAdmin);

  const { data: bug, isLoading } = useQuery({
    queryKey: ['bug-detail', bugId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('id, summary, description, expected_behaviour, steps_to_reproduce, severity, module, status, attachments, user_id, created_at, ai_analysis')
        .eq('id', bugId)
        .single();
      
      if (error) throw error;
      
      // Fetch profile separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', data.user_id)
        .single();
      
      // Initialize field values
      setSummaryValue(data.summary);
      setDescriptionValue(data.description);
      setExpectedBehaviourValue(data.expected_behaviour || '');
      setStepsToReproduceValue(data.steps_to_reproduce || '');
      setSeverityValue(data.severity);
      setModuleValue(data.module || '');
      setStatusValue(data.status);
      
      // Initialize loading states for images
      const attachments = Array.isArray(data.attachments) ? data.attachments : [];
      if (attachments.length > 0) {
        const loadingStates: Record<number, boolean> = {};
        attachments.forEach((_: string, idx: number) => {
          loadingStates[idx] = true;
        });
        setImageLoading(loadingStates);
      }
      
      return { ...data, profiles: profileData };
    },
    enabled: !!bugId && open,
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await supabase
        .from('bug_reports')
        .update({ [field]: value })
        .eq('id', bugId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-detail', bugId] });
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      queryClient.invalidateQueries({ queryKey: ['bug-hunt-dashboard'] });
      toast.success('Updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { data, error } = await supabase.functions.invoke('notify-bug-status-change', {
        body: { bugId, newStatus }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['bug-detail', bugId] });
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      queryClient.invalidateQueries({ queryKey: ['bug-hunt-dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const handleFieldSave = async (field: string, value: any, setEditing: (val: boolean) => void, setSaving: (val: boolean) => void) => {
    setSaving(true);
    try {
      await updateFieldMutation.mutateAsync({ field, value });
      setEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldCancel = (setEditing: (val: boolean) => void, setValue: (val: any) => void, originalValue: any) => {
    setValue(originalValue);
    setEditing(false);
  };

  const handleDelete = () => {
    deleteBug(bugId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        onClose();
      },
    });
  };

  const handleMarkAsFixed = () => {
    markAsFixed(bugId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['bug-detail', bugId] });
      },
    });
  };

  const handleArchive = () => {
    archiveBug({ bugId, reason: archiveReason || undefined }, {
      onSuccess: () => {
        setShowArchiveDialog(false);
        setArchiveReason('');
        onClose();
      },
    });
  };

  const handleImageLoad = (idx: number) => {
    setImageLoading(prev => ({ ...prev, [idx]: false }));
  };

  const handleImageError = (idx: number) => {
    setImageErrors(prev => ({ ...prev, [idx]: true }));
    setImageLoading(prev => ({ ...prev, [idx]: false }));
  };

  const isOriginalReporter = user?.id === bug?.user_id;
  const canEdit = isOriginalReporter || (isAdmin || isPlatformAdmin);

  const moduleOptions = [
    'dashboard',
    'kpi-tracker',
    'listing-pipeline',
    'messages',
    'task-manager',
    'notes',
    'review-roadmap',
    'coaches-corner',
    'transaction-management',
    'vendor-reporting',
    'role-playing',
    'nurture-calculator',
    'listing-description',
    'feedback-centre',
    'other'
  ];

  if (isLoading || !bug) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Bug Report Details
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">

          {/* Workspace / Module - Inline Editable */}
          <div className="space-y-2">
            <Label>Workspace / Module</Label>
            {editingModule ? (
              <div className="flex items-center gap-2">
                <Select
                  value={moduleValue}
                  onValueChange={setModuleValue}
                  disabled={savingModule}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {moduleOptions.map(mod => (
                      <SelectItem key={mod} value={mod}>
                        {mod}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFieldSave('module', moduleValue, setEditingModule, setSavingModule)}
                  disabled={savingModule}
                >
                  {savingModule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFieldCancel(setEditingModule, setModuleValue, bug.module)}
                  disabled={savingModule}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  "p-3 rounded-lg border bg-card text-sm",
                  (isAdmin || isPlatformAdmin) && "hover:bg-accent/20 cursor-pointer group"
                )}
                onClick={() => (isAdmin || isPlatformAdmin) && setEditingModule(true)}
              >
                {moduleValue || 'Not specified'}
                {(isAdmin || isPlatformAdmin) && (
                  <Pencil className="h-3 w-3 inline-block ml-2 opacity-0 group-hover:opacity-50 transition-opacity" />
                )}
              </div>
            )}
          </div>

          {/* Summary - Inline Editable */}
          <div className="space-y-2">
            <Label>Summary *</Label>
            {editingSummary ? (
              <div className="space-y-2">
                <Input
                  value={summaryValue}
                  onChange={(e) => setSummaryValue(e.target.value)}
                  maxLength={200}
                  disabled={savingSummary}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFieldSave('summary', summaryValue, setEditingSummary, setSavingSummary);
                    } else if (e.key === 'Escape') {
                      handleFieldCancel(setEditingSummary, setSummaryValue, bug.summary);
                    }
                  }}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleFieldSave('summary', summaryValue, setEditingSummary, setSavingSummary)}
                    disabled={savingSummary}
                  >
                    {savingSummary ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFieldCancel(setEditingSummary, setSummaryValue, bug.summary)}
                    disabled={savingSummary}
                  >
                    Cancel
                  </Button>
                  <span className="text-xs text-muted-foreground">Press Enter to save, Escape to cancel</span>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "p-3 rounded-lg border bg-card font-semibold",
                  canEdit && "hover:bg-accent/20 cursor-pointer group"
                )}
                onClick={() => canEdit && setEditingSummary(true)}
              >
                {summaryValue}
                {canEdit && (
                  <Pencil className="h-3 w-3 inline-block ml-2 opacity-0 group-hover:opacity-50 transition-opacity" />
                )}
              </div>
            )}
          </div>

          {/* Description - Inline Editable */}
          <div className="space-y-2">
            <Label>Description *</Label>
            {editingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  disabled={savingDescription}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      handleFieldCancel(setEditingDescription, setDescriptionValue, bug.description);
                    }
                  }}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleFieldSave('description', descriptionValue, setEditingDescription, setSavingDescription)}
                    disabled={savingDescription}
                  >
                    {savingDescription ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFieldCancel(setEditingDescription, setDescriptionValue, bug.description)}
                    disabled={savingDescription}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "p-3 rounded-lg border bg-card text-sm whitespace-pre-wrap",
                  canEdit && "hover:bg-accent/20 cursor-pointer group"
                )}
                onClick={() => canEdit && setEditingDescription(true)}
              >
                {descriptionValue}
                {canEdit && (
                  <Pencil className="h-3 w-3 inline-block ml-2 opacity-0 group-hover:opacity-50 transition-opacity" />
                )}
              </div>
            )}
          </div>

          {/* Expected Behaviour - Inline Editable */}
          <div className="space-y-2">
            <Label>Expected Behaviour</Label>
            {editingExpectedBehaviour ? (
              <div className="space-y-2">
                <Textarea
                  value={expectedBehaviourValue}
                  onChange={(e) => setExpectedBehaviourValue(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  disabled={savingExpectedBehaviour}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      handleFieldCancel(setEditingExpectedBehaviour, setExpectedBehaviourValue, bug.expected_behaviour || '');
                    }
                  }}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleFieldSave('expected_behaviour', expectedBehaviourValue, setEditingExpectedBehaviour, setSavingExpectedBehaviour)}
                    disabled={savingExpectedBehaviour}
                  >
                    {savingExpectedBehaviour ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFieldCancel(setEditingExpectedBehaviour, setExpectedBehaviourValue, bug.expected_behaviour || '')}
                    disabled={savingExpectedBehaviour}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "p-3 rounded-lg border bg-card text-sm whitespace-pre-wrap min-h-[60px]",
                  canEdit && "hover:bg-accent/20 cursor-pointer group"
                )}
                onClick={() => canEdit && setEditingExpectedBehaviour(true)}
              >
                {expectedBehaviourValue || (canEdit ? 'Click to add expected behaviour...' : 'Not specified')}
                {canEdit && (
                  <Pencil className="h-3 w-3 inline-block ml-2 opacity-0 group-hover:opacity-50 transition-opacity" />
                )}
              </div>
            )}
          </div>

          {/* Steps to Reproduce - Inline Editable */}
          <div className="space-y-2">
            <Label>Steps to Reproduce</Label>
            {editingStepsToReproduce ? (
              <div className="space-y-2">
                <Textarea
                  value={stepsToReproduceValue}
                  onChange={(e) => setStepsToReproduceValue(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  disabled={savingStepsToReproduce}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      handleFieldCancel(setEditingStepsToReproduce, setStepsToReproduceValue, bug.steps_to_reproduce || '');
                    }
                  }}
                  placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleFieldSave('steps_to_reproduce', stepsToReproduceValue, setEditingStepsToReproduce, setSavingStepsToReproduce)}
                    disabled={savingStepsToReproduce}
                  >
                    {savingStepsToReproduce ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFieldCancel(setEditingStepsToReproduce, setStepsToReproduceValue, bug.steps_to_reproduce || '')}
                    disabled={savingStepsToReproduce}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "p-3 rounded-lg border bg-card text-sm whitespace-pre-wrap min-h-[60px]",
                  canEdit && "hover:bg-accent/20 cursor-pointer group"
                )}
                onClick={() => canEdit && setEditingStepsToReproduce(true)}
              >
                {stepsToReproduceValue || (canEdit ? 'Click to add steps to reproduce...' : 'Not specified')}
                {canEdit && (
                  <Pencil className="h-3 w-3 inline-block ml-2 opacity-0 group-hover:opacity-50 transition-opacity" />
                )}
              </div>
            )}
          </div>

          {/* Severity - Inline Editable (Admin Only) */}
          {(isAdmin || isPlatformAdmin) && (
            <div className="space-y-2">
              <Label>Severity</Label>
              {editingSeverity ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={severityValue}
                    onValueChange={setSeverityValue}
                    disabled={savingSeverity}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFieldSave('severity', severityValue, setEditingSeverity, setSavingSeverity)}
                    disabled={savingSeverity}
                  >
                    {savingSeverity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFieldCancel(setEditingSeverity, setSeverityValue, bug.severity)}
                    disabled={savingSeverity}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="p-3 rounded-lg border bg-card text-sm hover:bg-accent/20 cursor-pointer group"
                  onClick={() => setEditingSeverity(true)}
                >
                  {severityValue}
                  <Pencil className="h-3 w-3 inline-block ml-2 opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>
              )}
            </div>
          )}

          {/* Screenshots */}
          {(() => {
            const attachments = Array.isArray(bug.attachments) ? bug.attachments : [];
            // Filter out invalid URLs
            const validAttachments = attachments.filter((url: string) => 
              url && typeof url === 'string' && url.trim().length > 0 && url.startsWith('http')
            );
            return validAttachments.length > 0 && (
              <div className="space-y-2">
                <Label>Screenshots ({validAttachments.length})</Label>
                <div className="grid grid-cols-2 gap-3">
                  {validAttachments.map((url: string, idx: number) => (
                    <div
                      key={idx}
                      className="group relative block rounded-lg overflow-hidden border hover:border-primary transition-colors cursor-pointer"
                      onClick={() => {
                        if (!imageErrors[idx]) {
                          setLightboxIndex(idx);
                          setLightboxOpen(true);
                        }
                      }}
                    >
                      {imageLoading[idx] && !imageErrors[idx] && (
                        <div className="w-full h-40 flex items-center justify-center bg-muted">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {imageErrors[idx] ? (
                        <div className="w-full h-40 flex flex-col items-center justify-center bg-muted space-y-2">
                          <AlertCircle className="h-6 w-6 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Failed to load</p>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline mt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open in new tab
                          </a>
                        </div>
                      ) : (
                        <>
                          <img
                            src={url}
                            alt={`Screenshot ${idx + 1}`}
                            className="w-full h-40 object-cover group-hover:scale-105 transition-transform screenshot-thumbnail"
                            onLoad={() => handleImageLoad(idx)}
                            onError={() => handleImageError(idx)}
                            style={{ display: imageLoading[idx] ? 'none' : 'block' }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Screenshot Lightbox */}
                {lightboxOpen && (
                  <ScreenshotLightbox
                    images={validAttachments}
                    initialIndex={lightboxIndex}
                    onClose={() => setLightboxOpen(false)}
                  />
                )}
              </div>
            );
          })()}

          {/* AI Analysis Panel - Always Visible, Collapsible */}
          <AIBugAnalysisPanel
            bugId={bugId}
            initialAnalysis={bug.ai_analysis}
            isAdmin={isAdmin || isPlatformAdmin}
          />

          {/* Metadata */}
          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Reported by: {bug.profiles?.full_name || bug.profiles?.email || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Created: {format(new Date(bug.created_at), 'MMM d, yyyy, h:mm a')}</span>
            </div>
          </div>

          {/* Comments Section */}
          <BugReportCommentsSection bugReportId={bugId} />

          {/* Admin Actions - Bottom */}
          {(isAdmin || isPlatformAdmin) && (
            <div className="flex flex-wrap gap-2 pt-6 border-t">
              {/* Mark as Fixed - only when in needs_review */}
              {bug.status === 'needs_review' && (
                <Button
                  variant="default"
                  onClick={handleMarkAsFixed}
                  disabled={isMarkingFixed}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Fixed
                </Button>
              )}
              {/* Archive - available for non-fixed/non-archived bugs */}
              {bug.status !== 'fixed' && bug.status !== 'archived' && (
                <Button
                  variant="outline"
                  onClick={() => setShowArchiveDialog(true)}
                  disabled={isArchiving}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              )}
              {/* Delete always available for admins */}
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </SheetContent>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bug Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The bug report and all associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Bug Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the bug as archived. You can optionally provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="Reason for archiving (optional)..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
            >
              {isArchiving ? 'Archiving...' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}