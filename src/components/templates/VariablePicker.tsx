import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Variable } from 'lucide-react';
import { useState } from 'react';

interface VariablePickerProps {
  onInsert: (variable: string) => void;
}

const variableGroups = [
  {
    label: 'Vendor/Client',
    variables: [
      { key: 'vendor_first_name', description: 'First name' },
      { key: 'vendor_last_name', description: 'Last name' },
      { key: 'vendor_email', description: 'Email address' },
      { key: 'vendor_phone', description: 'Phone number' },
    ],
  },
  {
    label: 'Property',
    variables: [
      { key: 'property_address', description: 'Full address' },
      { key: 'suburb', description: 'Suburb' },
      { key: 'sale_price', description: 'Sale price' },
    ],
  },
  {
    label: 'Agent',
    variables: [
      { key: 'agent_name', description: 'Agent full name' },
      { key: 'agent_first_name', description: 'Agent first name' },
      { key: 'agent_email', description: 'Agent email' },
      { key: 'agent_phone', description: 'Agent phone' },
    ],
  },
  {
    label: 'Dates',
    variables: [
      { key: 'settlement_date', description: 'Settlement date' },
      { key: 'anniversary_date', description: 'Anniversary date' },
      { key: 'years_since_settlement', description: 'Years since settlement' },
    ],
  },
  {
    label: 'Dynamic',
    variables: [
      { key: 'today', description: 'Today\'s date' },
      { key: 'greeting', description: 'Time-based greeting' },
    ],
  },
];

export function VariablePicker({ onInsert }: VariablePickerProps) {
  const [open, setOpen] = useState(false);

  const handleInsert = (variable: string) => {
    onInsert(`{{${variable}}}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Variable className="h-4 w-4" />
          Insert Variable
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-[12000]" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Merge Fields</h4>
          <p className="text-xs text-muted-foreground">
            Click to insert a variable into your template
          </p>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {variableGroups.map((group) => (
            <div key={group.label} className="p-2">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.variables.map((variable) => (
                  <button
                    key={variable.key}
                    onClick={() => handleInsert(variable.key)}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm flex items-center justify-between group"
                  >
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                      {`{{${variable.key}}}`}
                    </code>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground">
                      {variable.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
