import { HelpRequest } from '@/hooks/useHelpRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { AlertCircle, ArrowUp, CheckCircle2, Clock } from 'lucide-react';

interface HelpRequestCardProps {
  request: HelpRequest;
  onEscalate?: (id: string) => void;
  onResolve?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  showActions?: boolean;
}

const statusConfig = {
  open: { label: 'Open', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  acknowledged: { label: 'Acknowledged', color: 'bg-blue-100 text-blue-800', icon: Clock },
  escalated: { label: 'Escalated', color: 'bg-red-100 text-red-800', icon: ArrowUp },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800', icon: CheckCircle2 },
};

const categoryLabels = {
  tech_issue: 'Tech Issue',
  coaching_help: 'Coaching Help',
  listing_issue: 'Listing Issue',
  training_request: 'Training Request',
  other: 'Other',
};

const escalationLabels = {
  team_leader: 'Team Leader',
  office_manager: 'Office Manager',
  platform_admin: 'Platform Admin',
};

export function HelpRequestCard({ request, onEscalate, onResolve, onAcknowledge, showActions = true }: HelpRequestCardProps) {
  const statusInfo = statusConfig[request.status];
  const StatusIcon = statusInfo.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base">{request.title}</CardTitle>
            <CardDescription className="text-sm">
              {format(new Date(request.created_at), 'MMM d, yyyy • h:mm a')}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge className={statusInfo.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {escalationLabels[request.escalation_level]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Badge variant="secondary" className="mb-2">
            {categoryLabels[request.category]}
          </Badge>
          <p className="text-sm text-muted-foreground">{request.description}</p>
        </div>

        {showActions && request.status !== 'resolved' && request.status !== 'closed' && (
          <div className="flex gap-2 pt-2">
            {request.status === 'open' && onAcknowledge && (
              <Button size="sm" variant="outline" onClick={() => onAcknowledge(request.id)}>
                <Clock className="w-4 h-4 mr-1" />
                Acknowledge
              </Button>
            )}
            {request.escalation_level !== 'platform_admin' && onEscalate && (
              <Button size="sm" variant="outline" onClick={() => onEscalate(request.id)}>
                <ArrowUp className="w-4 h-4 mr-1" />
                Escalate
              </Button>
            )}
            {onResolve && (
              <Button size="sm" onClick={() => onResolve(request.id)}>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Resolve
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
