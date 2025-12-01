import { KanbanColumn } from '@/components/ui/kanban-column';
import { Listing } from '@/hooks/useListingPipeline';

interface MonthColumn {
  id: string;
  label: string;
  date: Date;
  isCurrent: boolean;
  isPast: boolean;
}

interface QuarterlyKanbanSectionProps {
  quarter: string;
  quarterColor: string;
  months: MonthColumn[];
  getListingsForMonth: (monthDate: Date) => Listing[];
  onAddCard: (monthId: string) => void;
  renderCard: (listing: Listing) => React.ReactNode;
}

export const QuarterlyKanbanSection = ({
  quarter,
  quarterColor,
  months,
  getListingsForMonth,
  onAddCard,
  renderCard,
}: QuarterlyKanbanSectionProps) => {
  return (
    <div className={`rounded-lg border-2 p-2 space-y-2 flex-1 min-w-0 ${quarterColor}`}>
      {/* Quarter Label */}
      <div className="flex items-center justify-between px-1">
        <h2 className="font-bold text-xs text-foreground/70">{quarter}</h2>
      </div>

      {/* Month Columns */}
      <div className="flex gap-2 w-full">
        {months.map((month) => {
          const columnListings = getListingsForMonth(month.date);
          
          return (
            <KanbanColumn
              key={month.id}
              id={month.id}
              label={month.label}
              onAddCard={() => onAddCard(month.id)}
              addButtonText="Add Opportunity"
              color={month.isCurrent ? 'border-primary' : 'border-muted'}
              items={columnListings}
              getItemId={(listing) => listing.id}
              renderItem={renderCard}
            />
          );
        })}
      </div>
    </div>
  );
};
