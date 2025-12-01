import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PipelineViewSelectorProps {
  value: 'individual' | 'team' | 'both';
  onChange: (value: 'individual' | 'team' | 'both') => void;
}

export const PipelineViewSelector = ({ value, onChange }: PipelineViewSelectorProps) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="individual">My Stats Only</SelectItem>
        <SelectItem value="team">Team Stats Only</SelectItem>
        <SelectItem value="both">Both</SelectItem>
      </SelectContent>
    </Select>
  );
};
