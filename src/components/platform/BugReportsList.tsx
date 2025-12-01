import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBugReports, BugReport } from '@/hooks/useBugReports';
import { BugDetailDrawer } from '@/components/feedback/BugDetailDrawer';
import { format } from 'date-fns';
import { Paperclip, AlertCircle } from 'lucide-react';

interface BugReportsListProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export const BugReportsList = ({ statusFilter, onStatusFilterChange }: BugReportsListProps) => {
  const [selectedBugId, setSelectedBugId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const { bugReports, isLoadingReports, updateStatus, updateSeverity } = useBugReports(statusFilter);

  const handleBugClick = (bug: BugReport) => {
    setSelectedBugId(bug.id);
    setIsDrawerOpen(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300';
      case 'medium':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case 'high':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-300';
      case 'critical':
        return 'bg-red-500/10 text-red-700 dark:text-red-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'investigating':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'fixed':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'duplicate':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
      case 'rejected':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoadingReports) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bugReports.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">No bug reports found</p>
        <p className="text-sm text-muted-foreground">
          {statusFilter === 'all' ? 'No bug reports yet' : `No ${statusFilter} bug reports`}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {bugReports.map((bug) => (
          <Card key={bug.id} className="hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2 cursor-pointer" onClick={() => handleBugClick(bug)}>
                    <h3 className="font-semibold text-lg">{bug.summary}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {bug.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>By {bug.profiles?.full_name || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{format(new Date(bug.created_at), 'MMM d, yyyy')}</span>
                      {bug.module && (
                        <>
                          <span>•</span>
                          <span className="font-medium">{bug.module}</span>
                        </>
                      )}
                      {bug.attachments && bug.attachments.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {bug.attachments.length}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Badge className={getSeverityColor(bug.severity)}>
                      {bug.severity.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(bug.status)}>
                      {bug.status.charAt(0).toUpperCase() + bug.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Select
                    value={bug.status}
                    onValueChange={(value) => updateStatus({ bugId: bug.id, status: value })}
                  >
                    <SelectTrigger className="w-[160px] h-8">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="duplicate">Duplicate</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={bug.severity}
                    onValueChange={(value) => updateSeverity({ bugId: bug.id, severity: value })}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <BugDetailDrawer
        bugId={selectedBugId || ''}
        open={isDrawerOpen && !!selectedBugId}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
};
