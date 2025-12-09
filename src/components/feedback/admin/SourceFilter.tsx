import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type SourceType = 'all' | 'agentbuddy' | 'beacon';

interface SourceFilterProps {
  value: SourceType;
  onChange: (value: SourceType) => void;
}

const SOURCES = [
  { value: 'all' as const, label: 'All', icon: null },
  { value: 'agentbuddy' as const, label: 'AgentBuddy', icon: '🅰️' },
  { value: 'beacon' as const, label: 'Beacon', icon: '🅱️' },
];

export function SourceFilter({ value, onChange }: SourceFilterProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(val) => val && onChange(val as SourceType)}
      className="gap-1"
    >
      {SOURCES.map((source) => (
        <ToggleGroupItem
          key={source.value}
          value={source.value}
          size="sm"
          className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {source.icon && <span className="mr-1">{source.icon}</span>}
          {source.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export type { SourceType };
