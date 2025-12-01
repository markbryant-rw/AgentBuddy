import { Lock, Users, Building, UserPlus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface NoteVisibilitySelectorProps {
  value: 'private' | 'team' | 'office' | 'friend';
  onChange: (value: 'private' | 'team' | 'office' | 'friend') => void;
  disabled?: boolean;
}

const VISIBILITY_OPTIONS = [
  {
    value: 'private' as const,
    label: 'Private',
    description: 'Only you can see this note',
    icon: Lock,
  },
  {
    value: 'team' as const,
    label: 'Team',
    description: 'Everyone in your team can see',
    icon: Users,
  },
  {
    value: 'office' as const,
    label: 'Office',
    description: 'Everyone in your office can see',
    icon: Building,
  },
  {
    value: 'friend' as const,
    label: 'Friends',
    description: 'Share with selected friends',
    icon: UserPlus,
  },
];

export const NoteVisibilitySelector = ({
  value,
  onChange,
  disabled = false,
}: NoteVisibilitySelectorProps) => {
  const currentOption = VISIBILITY_OPTIONS.find(opt => opt.value === value) || VISIBILITY_OPTIONS[0];
  const Icon = currentOption.icon;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[180px] h-9">
        <SelectValue>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{currentOption.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {VISIBILITY_OPTIONS.map((option) => {
          const OptionIcon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-3 py-1">
                <OptionIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
