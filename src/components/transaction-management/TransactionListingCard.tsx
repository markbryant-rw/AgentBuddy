import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle, MoreVertical, MessageSquare, CheckSquare, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { Transaction, TransactionStage } from '@/hooks/useTransactions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TransactionListingCardProps {
  transaction: Transaction;
  onClick: () => void;
}

const STAGE_COLORS: Record<TransactionStage, string> = {
  signed: 'border-l-rose-500',
  live: 'border-l-indigo-500',
  contract: 'border-l-amber-500',
  unconditional: 'border-l-teal-500',
  settled: 'border-l-gray-400',
};

export const TransactionListingCard = ({ transaction, onClick }: TransactionListingCardProps) => {
  const progress = transaction.tasks_total > 0
    ? Math.round((transaction.tasks_done / transaction.tasks_total) * 100)
    : 0;

  const overdueCount = 0; // TODO: Calculate from tasks

  // Get next upcoming date
  const upcomingDate = transaction.live_date || transaction.auction_deadline_date || transaction.expected_settlement;

  return (
    <Card
      className={`p-4 hover:shadow-lg transition-all cursor-pointer border-l-4 ${STAGE_COLORS[transaction.stage]} group relative`}
      onClick={onClick}
    >
      {/* Quick Actions Menu */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Note
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CheckSquare className="h-4 w-4 mr-2" />
              Add Task
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3">
        {/* Address & Suburb */}
        <div>
          <h3 className="font-semibold text-base line-clamp-1">{transaction.address}</h3>
          {transaction.suburb && (
            <p className="text-sm text-muted-foreground">{transaction.suburb}</p>
          )}
        </div>

        {/* Vendor Names */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {transaction.client_name?.charAt(0) || 'V'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground truncate">
            {transaction.client_name}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>

        {/* Key Dates Row */}
        {upcomingDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Next: {format(new Date(upcomingDate), 'dd MMM yyyy')}
            </span>
          </div>
        )}

        {/* Overdue Indicator */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{overdueCount} overdue</span>
          </div>
        )}

        {/* Assignees */}
        {transaction.assignees && Array.isArray(transaction.assignees) && transaction.assignees.length > 0 && (
          <div className="flex items-center gap-1">
            {transaction.assignees.slice(0, 3).map((assignee: any, index: number) => (
              <Avatar key={`${assignee.role || 'assignee'}-${index}`} className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {assignee.role?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
            ))}
            {transaction.assignees.length > 3 && (
              <Badge variant="secondary" className="text-xs ml-1">
                +{transaction.assignees.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
