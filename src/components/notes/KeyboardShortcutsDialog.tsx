import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KeyboardShortcutsDialog = ({ open, onOpenChange }: KeyboardShortcutsDialogProps) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: [cmdKey, 'N'], description: 'Create new note' },
        { keys: [cmdKey, 'K'], description: 'Search notes' },
        { keys: ['Esc'], description: 'Exit editor' },
      ],
    },
    {
      category: 'Editor',
      items: [
        { keys: [cmdKey, 'B'], description: 'Bold text' },
        { keys: [cmdKey, 'I'], description: 'Italic text' },
        { keys: [cmdKey, 'U'], description: 'Underline text' },
        { keys: [cmdKey, 'Shift', 'F'], description: 'Toggle focus mode' },
        { keys: [cmdKey, '/'], description: 'AI actions menu' },
      ],
    },
    {
      category: 'Formatting',
      items: [
        { keys: [cmdKey, 'Alt', '1'], description: 'Heading 1' },
        { keys: [cmdKey, 'Alt', '2'], description: 'Heading 2' },
        { keys: [cmdKey, 'Shift', '7'], description: 'Ordered list' },
        { keys: [cmdKey, 'Shift', '8'], description: 'Bullet list' },
        { keys: [cmdKey, 'Shift', '9'], description: 'Task list' },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {shortcuts.map((section, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="font-semibold text-lg text-primary">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <span className="text-sm">{item.description}</span>
                    <div className="flex gap-1">
                      {item.keys.map((key, keyIdx) => (
                        <Kbd key={keyIdx}>{key}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t text-sm text-muted-foreground text-center">
          Press <Kbd>?</Kbd> anytime to show this dialog
        </div>
      </DialogContent>
    </Dialog>
  );
};
