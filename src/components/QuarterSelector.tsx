import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancialYear } from '@/hooks/useFinancialYear';

interface QuarterSelectorProps {
  quarter: number;
  year: number;
  onQuarterChange: (quarter: number, year: number) => void;
}

export const QuarterSelector = ({ quarter, year, onQuarterChange }: QuarterSelectorProps) => {
  const { usesFinancialYear, getQuarterInfo } = useFinancialYear();
  
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  const quarters = [1, 2, 3, 4];

  const selectedQuarterInfo = getQuarterInfo(quarter, year);

  return (
    <div className="flex gap-2 items-center">
      <Select value={quarter.toString()} onValueChange={(v) => onQuarterChange(parseInt(v), year)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {quarters.map((q) => {
            const info = getQuarterInfo(q, year);
            return (
              <SelectItem key={q} value={q.toString()}>
                {info.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Select value={year.toString()} onValueChange={(v) => onQuarterChange(quarter, parseInt(v))}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-sm text-muted-foreground">
        ({selectedQuarterInfo.dateRangeLabel})
      </span>
    </div>
  );
};
