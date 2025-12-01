import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { COLLAPSE_REASONS } from '@/lib/stageTransitionConfig';

interface DealHistoryEntry {
  type: string;
  stage_from: string;
  stage_to: string;
  collapse_date: string;
  collapse_reason: string;
  notes?: string;
  contract_date?: string;
  conditional_date?: string;
  buyer_names?: any[];
  recorded_at: string;
}

interface DealHistorySectionProps {
  dealHistory: DealHistoryEntry[];
}

export const DealHistorySection = ({ dealHistory }: DealHistorySectionProps) => {
  if (!dealHistory || dealHistory.length === 0) {
    return null;
  }

  const getReasonLabel = (value: string) => {
    const reason = COLLAPSE_REASONS.find((r) => r.value === value);
    return reason?.label || value;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <h3 className="font-semibold text-sm">Deal History</h3>
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          {dealHistory.length} collapse{dealHistory.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-2">
        {dealHistory.map((entry, index) => (
          <Card key={index} className="p-3 border-orange-200 bg-orange-50/50">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900">
                    {getReasonLabel(entry.collapse_reason)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="capitalize">{entry.stage_from}</span> → <span className="capitalize">{entry.stage_to}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(entry.collapse_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {entry.notes && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t border-orange-200">
                  <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <p className="flex-1">{entry.notes}</p>
                </div>
              )}

              {entry.buyer_names && entry.buyer_names.length > 0 && (
                <div className="text-xs text-muted-foreground pt-2 border-t border-orange-200">
                  Previous buyer: {entry.buyer_names.map((b: any) => `${b.first_name} ${b.last_name}`).join(', ')}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground italic">
        Historical data preserved for business intelligence and reporting
      </p>
    </div>
  );
};
