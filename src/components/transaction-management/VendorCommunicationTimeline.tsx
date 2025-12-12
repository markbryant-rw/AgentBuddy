import { useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Sparkles, 
  FileText, 
  MessageSquare, 
  Eye, 
  Send, 
  Flame,
  Clock,
  Edit,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BeaconReport } from '@/hooks/useBeaconReports';
import { REPORT_TYPE_LABELS, BeaconReportType } from '@/hooks/useBeaconIntegration';
import { TransactionNote } from '@/hooks/useTransactionNotes';

interface VendorReport {
  id: string;
  campaign_week: number;
  created_at: string;
  creator_name?: string | null;
  vendor_report?: string;
}

interface TimelineItem {
  id: string;
  type: 'beacon_report' | 'weekly_report' | 'note';
  date: Date;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  data: BeaconReport | VendorReport | TransactionNote;
  actions?: React.ReactNode;
}

interface VendorCommunicationTimelineProps {
  beaconReports?: BeaconReport[];
  weeklyReports?: VendorReport[];
  notes?: TransactionNote[];
  onViewBeaconReport?: (report: BeaconReport) => void;
  onEditBeaconReport?: (report: BeaconReport) => void;
  onViewWeeklyReport?: (report: VendorReport) => void;
  onViewNote?: (note: TransactionNote) => void;
}

export const VendorCommunicationTimeline = ({
  beaconReports = [],
  weeklyReports = [],
  notes = [],
  onViewBeaconReport,
  onEditBeaconReport,
  onViewWeeklyReport,
  onViewNote,
}: VendorCommunicationTimelineProps) => {
  // Merge all items into a single timeline
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    // Add Beacon reports
    beaconReports.forEach((report) => {
      const isHotLead = report.is_hot_lead || report.propensity_score >= 70;
      const hasViews = report.total_views > 0;
      const isSent = !!report.sent_at;

      items.push({
        id: `beacon-${report.id}`,
        type: 'beacon_report',
        date: new Date(report.created_at),
        title: REPORT_TYPE_LABELS[report.report_type as BeaconReportType] || 'Beacon Report',
        subtitle: isHotLead 
          ? `🔥 Hot Lead - ${report.propensity_score}% propensity` 
          : hasViews 
            ? `${report.total_views} views` 
            : isSent 
              ? 'Sent to vendor' 
              : 'Draft',
        icon: <Sparkles className="h-3.5 w-3.5" />,
        iconBg: isHotLead ? 'bg-red-500/20 text-red-600' : 'bg-teal-500/20 text-teal-600',
        data: report,
        actions: (
          <div className="flex gap-1">
            {report.report_url && onEditBeaconReport && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => onEditBeaconReport(report)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit in Beacon</TooltipContent>
              </Tooltip>
            )}
            {report.personalized_url && onViewBeaconReport && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => onViewBeaconReport(report)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View vendor report</TooltipContent>
              </Tooltip>
            )}
          </div>
        ),
      });
    });

    // Add weekly vendor reports
    weeklyReports.forEach((report) => {
      items.push({
        id: `weekly-${report.id}`,
        type: 'weekly_report',
        date: new Date(report.created_at),
        title: `Week ${report.campaign_week} Report`,
        subtitle: report.creator_name ? `by ${report.creator_name}` : undefined,
        icon: <FileText className="h-3.5 w-3.5" />,
        iconBg: 'bg-amber-500/20 text-amber-600',
        data: report,
        actions: onViewWeeklyReport && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => onViewWeeklyReport(report)}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View report</TooltipContent>
          </Tooltip>
        ),
      });
    });

    // Add notes
    notes.forEach((note) => {
      items.push({
        id: `note-${note.id}`,
        type: 'note',
        date: new Date(note.created_at),
        title: 'Note added',
        subtitle: note.author?.full_name || 'Team member',
        icon: <MessageSquare className="h-3.5 w-3.5" />,
        iconBg: 'bg-purple-500/20 text-purple-600',
        data: note,
        actions: onViewNote && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => onViewNote(note)}
              >
                <Eye className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View note</TooltipContent>
          </Tooltip>
        ),
      });
    });

    // Sort by date descending (most recent first)
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [beaconReports, weeklyReports, notes, onViewBeaconReport, onEditBeaconReport, onViewWeeklyReport, onViewNote]);

  if (timelineItems.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No vendor communications yet</p>
        <p className="text-xs mt-1">Create a Beacon report or weekly summary to get started</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-3">
          {timelineItems.map((item, index) => (
            <div key={item.id} className="relative flex gap-3 pl-1">
              {/* Icon */}
              <div className={cn(
                "relative z-10 h-7 w-7 rounded-full flex items-center justify-center ring-4 ring-background",
                item.iconBg
              )}>
                {item.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] h-4 px-1.5 font-normal",
                          item.type === 'beacon_report' && "border-teal-500/30 text-teal-600",
                          item.type === 'weekly_report' && "border-amber-500/30 text-amber-600",
                          item.type === 'note' && "border-purple-500/30 text-purple-600"
                        )}
                      >
                        {item.type === 'beacon_report' && 'Beacon'}
                        {item.type === 'weekly_report' && 'Weekly'}
                        {item.type === 'note' && 'Note'}
                      </Badge>
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(item.date, 'MMM d, yyyy')} · {formatDistanceToNow(item.date, { addSuffix: true })}
                    </p>
                  </div>
                  {item.actions}
                </div>

                {/* Preview content for notes */}
                {item.type === 'note' && (item.data as TransactionNote).body && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 bg-muted/50 rounded px-2 py-1">
                    {(item.data as TransactionNote).body}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};
