import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface MentionListProps {
  items: Array<{ id: string; full_name: string; avatar_url?: string }>;
  command: (item: any) => void;
}

export interface MentionListRef {
  onKeyDown?: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.full_name });
      }
    };

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }

        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }

        if (event.key === 'Enter') {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-[300px] overflow-y-auto">
        {items.length > 0 ? (
          items.map((item, index) => (
            <button
              key={item.id}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent transition-colors',
                index === selectedIndex && 'bg-accent'
              )}
              onClick={() => selectItem(index)}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={item.avatar_url} />
                <AvatarFallback className="text-xs">
                  {item.full_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{item.full_name}</span>
            </button>
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No users found
          </div>
        )}
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';
