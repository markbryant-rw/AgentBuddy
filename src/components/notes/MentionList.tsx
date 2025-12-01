import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MentionListProps {
  items: Array<{ id: string; full_name: string | null; email: string; avatar_url: string | null }>;
  command: (item: any) => void;
}

export const MentionList = forwardRef<any, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.id, label: item.full_name || item.email });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

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

  if (props.items.length === 0) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm text-muted-foreground">
        No team members found
      </div>
    );
  }

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-80 overflow-y-auto">
      {props.items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => selectItem(index)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors ${
            index === selectedIndex ? 'bg-accent' : ''
          }`}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={item.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {(item.full_name || item.email)[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {item.full_name || item.email}
            </div>
            {item.full_name && (
              <div className="text-xs text-muted-foreground truncate">
                {item.email}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = 'MentionList';
