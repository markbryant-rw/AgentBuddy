import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Calendar, User, Lightbulb, ArrowUp, Trash2, Loader2, AlertCircle, Maximize2 } from "lucide-react";
import { format } from "date-fns";
import { useFeatureRequestComments } from "@/hooks/useFeatureRequestComments";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureRequests } from "@/hooks/useFeatureRequests";
import { ScreenshotLightbox } from "./ScreenshotLightbox";

interface FeatureRequestDetailDrawerProps {
  requestId: string;
  open: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export function FeatureRequestDetailDrawer({ requestId, open, onClose, isAdmin }: FeatureRequestDetailDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { deleteRequest, isDeleting } = useFeatureRequests();
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*, user_roles(*)')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const isPlatformAdmin = profile?.user_roles?.some(
    (role: any) => role.role === 'platform_admin' && !role.revoked_at
  ) || false;

  const { data: request, isLoading } = useQuery({
    queryKey: ['feature-request-detail', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*, profiles(full_name, email)')
        .eq('id', requestId)
        .single();
      
      if (error) throw error;
      
      setNewStatus(data.status);
      setNewPriority(data.priority || 'medium');
      
      // Initialize loading states for images
      const attachments = Array.isArray(data.attachments) ? data.attachments : [];
      if (attachments.length > 0) {
        const loadingStates: Record<number, boolean> = {};
        attachments.forEach((_: string, idx: number) => {
          loadingStates[idx] = true;
        });
        setImageLoading(loadingStates);
      }
      
      return data;
    },
    enabled: !!requestId && open,
  });

  const handleImageLoad = (idx: number) => {
    setImageLoading(prev => ({ ...prev, [idx]: false }));
  };

  const handleImageError = (idx: number) => {
    setImageErrors(prev => ({ ...prev, [idx]: true }));
    setImageLoading(prev => ({ ...prev, [idx]: false }));
  };

  const { comments, addComment, deleteComment } = useFeatureRequestComments(requestId);

  const updateRequest = useMutation({
    mutationFn: async () => {
      const updates: any = {
        status: newStatus,
        priority: newPriority,
      };

      if (adminNotes.trim()) {
        updates.admin_notes = adminNotes.trim();
      }

      const { data, error } = await supabase
        .from('feature_requests')
        .update(updates)
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Feature request updated successfully');
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['feature-request-detail', requestId] });
      setAdminNotes('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    await addComment(newComment.trim());
    
    setNewComment('');
  };

  const handleDelete = () => {
    deleteRequest(requestId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        onClose();
      },
    });
  };

  if (isLoading || !request) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading request details...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-500';
      case 'in_progress': return 'bg-blue-500/10 text-blue-500';
      case 'completed': return 'bg-green-500/10 text-green-500';
      case 'declined': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-slate-500/10 text-slate-500';
      case 'medium': return 'bg-blue-500/10 text-blue-500';
      case 'high': return 'bg-orange-500/10 text-orange-500';
      case 'critical': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-indigo-500" />
              Feature Request Details
            </SheetTitle>
            {isPlatformAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Header Info */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={getStatusColor(request.status)}>
              {request.status.replace('_', ' ')}
            </Badge>
            <Badge className={getPriorityColor(request.priority || 'medium')}>
              {request.priority || 'medium'} priority
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              {request.vote_count} votes
            </Badge>
          </div>

          {/* Title */}
          <div>
            <h3 className="font-semibold text-lg mb-2">{request.title}</h3>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.description}</p>
          </div>

          {/* Attachments/Screenshots */}
          {(() => {
            const attachments = Array.isArray(request.attachments) ? request.attachments : [];
            const validAttachments = attachments.filter((url: string) => 
              url && typeof url === 'string' && url.trim().length > 0 && url.startsWith('http')
            );
            return validAttachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Screenshots ({validAttachments.length})</h4>
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
                        <div className="w-full h-32 flex items-center justify-center bg-muted">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {imageErrors[idx] ? (
                        <div className="w-full h-32 flex flex-col items-center justify-center bg-muted space-y-2">
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
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform screenshot-thumbnail"
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

          {/* Metadata */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Requested by: {request.profiles?.full_name || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Created: {format(new Date(request.created_at), 'PPp')}</span>
            </div>
          </div>

          {/* Admin Notes */}
          {request.admin_notes && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg">
              <h4 className="font-medium mb-2">Admin Notes</h4>
              <p className="text-sm">{request.admin_notes}</p>
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Comments</h4>
            <div className="space-y-3 mb-4">
              {comments?.map((comment) => (
                <div key={comment.id} className="p-3 rounded-lg bg-muted">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {comment.profiles?.full_name || 'Unknown'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), 'PPp')}
                    </span>
                  </div>
                  <p className="text-sm">{comment.comment}</p>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
              />
              <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                Post
              </Button>
            </div>
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Admin Actions</h4>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Update Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={newPriority} onValueChange={setNewPriority}>
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
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (Optional)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes or updates for the requester..."
                  rows={3}
                />
              </div>

              <Button
                onClick={() => updateRequest.mutate()}
                disabled={updateRequest.isPending}
                className="w-full"
              >
                {updateRequest.isPending ? 'Updating...' : 'Update Feature Request'}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feature request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
