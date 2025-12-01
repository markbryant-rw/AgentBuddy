import { LayoutGrid, List } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ListingViewSelectorProps {
  value: 'kanban' | 'list';
  onChange: (value: 'kanban' | 'list') => void;
}

export const ListingViewSelector = ({ value, onChange }: ListingViewSelectorProps) => {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as any)}>
      <TabsList>
        <TabsTrigger value="kanban" className="gap-2">
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Kanban</span>
        </TabsTrigger>
        <TabsTrigger value="list" className="gap-2">
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">List</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
