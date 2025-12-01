import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ListingStatusSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const statusConfig = {
  lead: { label: 'Lead', color: 'bg-gray-500' },
  live: { label: 'Live', color: 'bg-blue-500' },
  under_contract: { label: 'Under Contract', color: 'bg-amber-500' },
  unconditional: { label: 'Unconditional', color: 'bg-purple-500' },
  settled: { label: 'Settled', color: 'bg-emerald-500' },
};

export const ListingStatusSelector = ({ value, onChange, disabled }: ListingStatusSelectorProps) => {
  const currentStatus = statusConfig[value as keyof typeof statusConfig] || statusConfig.lead;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${currentStatus.color}`} />
            <span>{currentStatus.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusConfig).map(([key, config]) => (
          <SelectItem key={key} value={key}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${config.color}`} />
              <span>{config.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const ListingStatusBadge = ({ status }: { status: string }) => {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.lead;
  
  return (
    <Badge variant="secondary" className="gap-2">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      {config.label}
    </Badge>
  );
};
