import { Plus, FileText, CheckSquare, Mic } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface FloatingActionButtonProps {
  onNewNote: () => void;
  onNewChecklist?: () => void;
  onNewVoiceNote?: () => void;
}

export const FloatingActionButton = ({ 
  onNewNote, 
  onNewChecklist, 
  onNewVoiceNote 
}: FloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: FileText, label: 'Note', onClick: onNewNote, color: 'bg-blue-500' },
    ...(onNewChecklist ? [{ icon: CheckSquare, label: 'Checklist', onClick: onNewChecklist, color: 'bg-green-500' }] : []),
    ...(onNewVoiceNote ? [{ icon: Mic, label: 'Voice', onClick: onNewVoiceNote, color: 'bg-purple-500' }] : []),
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-3 flex flex-col gap-2 animate-fade-in">
          {actions.map((action, index) => (
            <Button
              key={action.label}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className={`fab h-12 w-12 ${action.color} shadow-lg hover:scale-110 transition-transform`}
              size="icon"
              title={action.label}
            >
              <action.icon className="h-5 w-5" />
            </Button>
          ))}
        </div>
      )}
      
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fab"
        size="icon"
      >
        <Plus className={`h-6 w-6 transition-transform ${isOpen ? 'rotate-45' : ''}`} />
      </Button>
    </div>
  );
};
