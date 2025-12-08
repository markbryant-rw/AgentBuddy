import { useState } from 'react';
import { LoggedAppraisal, useLoggedAppraisals } from '@/hooks/useLoggedAppraisals';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VisitTimelineProps {
  visits: LoggedAppraisal[];
  currentVisitId?: string;
  onVisitClick?: (visit: LoggedAppraisal) => void;
  onVisitDeleted?: () => void;
}

export const VisitTimeline = ({ visits, currentVisitId, onVisitClick, onVisitDeleted }: VisitTimelineProps) => {
  const { deleteAppraisal } = useLoggedAppraisals();
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; visit: LoggedAppraisal | null }>({
    open: false,
    visit: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleDeleteClick = (e: React.MouseEvent, visit: LoggedAppraisal) => {
    e.stopPropagation();
    setDeleteConfirm({ open: true, visit });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.visit) return;
    
    setIsDeleting(true);
    try {
      await deleteAppraisal(deleteConfirm.visit.id);
      toast({
        title: "Visit deleted",
        description: `Visit from ${format(new Date(deleteConfirm.visit.appraisal_date), 'dd MMM yyyy')} has been removed`,
      });
      setDeleteConfirm({ open: false, visit: null });
      onVisitDeleted?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete visit",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (visits.length === 0) return null;

  return (
    <>
      <div className="space-y-3 p-4 rounded-lg bg-muted/50">
        <h3 className="text-base font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2">
          <span>Visit Timeline</span>
          <Badge variant="secondary" className="text-xs">{visits.length} visit{visits.length > 1 ? 's' : ''}</Badge>
        </h3>
        
        <div className="space-y-3">
          {visits.map((visit, index) => {
            const isCurrent = visit.id === currentVisitId;
            const isLatest = index === 0;
            const canDelete = visits.length > 1; // Don't allow deleting the last visit
            
            return (
              <div
                key={visit.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer group transition-colors hover:bg-muted/50",
                  isCurrent ? "bg-primary/5 border-primary/30" : "border-border/50"
                )}
                onClick={() => onVisitClick?.(visit)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "font-medium text-sm",
                        isCurrent && "text-primary"
                      )}>
                        {format(new Date(visit.appraisal_date), 'dd MMM yyyy')}
                      </span>
                      {isLatest && (
                        <Badge variant="secondary" className="text-xs">Latest</Badge>
                      )}
                      {isCurrent && (
                        <Badge variant="default" className="text-xs">Current</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {visit.stage && <span>{visit.stage}</span>}
                      {visit.intent && (
                        <Badge variant="outline" className={cn(
                          "text-xs py-0",
                          visit.intent === 'high' && "text-red-500 border-red-500/20",
                          visit.intent === 'medium' && "text-orange-500 border-orange-500/20",
                          visit.intent === 'low' && "text-blue-500 border-blue-500/20"
                        )}>
                          {visit.intent}
                        </Badge>
                      )}
                      {visit.outcome && visit.outcome !== 'In Progress' && (
                        <Badge variant="outline" className={cn(
                          "text-xs py-0",
                          visit.outcome === 'WON' && "text-emerald-600 bg-emerald-100 border-emerald-200",
                          visit.outcome === 'LOST' && "text-red-600 bg-red-100 border-red-200"
                        )}>
                          {visit.outcome}
                        </Badge>
                      )}
                    </div>
                    
                    {visit.estimated_value && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Est: ${visit.estimated_value.toLocaleString()}
                      </div>
                    )}
                    
                    {visit.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 group-hover:line-clamp-none transition-all">
                        {visit.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteClick(e, visit)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {visit.agent && (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={visit.agent.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(visit.agent.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, visit: open ? deleteConfirm.visit : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the visit from{' '}
              <span className="font-medium">
                {deleteConfirm.visit && format(new Date(deleteConfirm.visit.appraisal_date), 'dd MMM yyyy')}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Visit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
