import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Home, TrendingUp, Target, Users, CheckSquare } from 'lucide-react';

interface Template {
  id: string;
  title: string;
  description: string;
  icon: any;
  content: any;
  aiAction?: 'meeting-summary' | 'property-notes';
}

const templates: Template[] = [
  {
    id: 'meeting',
    title: 'Weekly Team Meeting',
    description: 'Auto-generate meeting notes from recent activity',
    icon: Calendar,
    content: null,
    aiAction: 'meeting-summary',
  },
  {
    id: 'property',
    title: 'Property Showing Notes',
    description: 'Template for property viewings and client feedback',
    icon: Home,
    content: null,
    aiAction: 'property-notes',
  },
  {
    id: 'market',
    title: 'Market Analysis',
    description: 'Compare properties and market trends',
    icon: TrendingUp,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Market Analysis' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Overview' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Brief market overview...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Comparable Properties' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Property 1: ' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Property 2: ' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Property 3: ' }] }] },
        ]},
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Pricing Strategy' }] },
        { type: 'paragraph' },
      ],
    },
  },
  {
    id: 'goals',
    title: 'Goal Planning',
    description: 'Set and track quarterly goals',
    icon: Target,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Quarterly Goals' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Q1 2024 Objectives' }] },
        { type: 'taskList', content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Goal 1' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Goal 2' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Goal 3' }] }] },
        ]},
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Key Metrics' }] },
        { type: 'paragraph' },
      ],
    },
  },
  {
    id: 'client',
    title: 'Client Meeting Notes',
    description: 'Structure for client consultations',
    icon: Users,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Client Meeting' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '📅 Date: ' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '👤 Client: ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Discussion Points' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph' }] },
        ]},
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Action Items' }] },
        { type: 'taskList', content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
        ]},
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Follow-up' }] },
        { type: 'paragraph' },
      ],
    },
  },
  {
    id: 'checklist',
    title: 'Simple Checklist',
    description: 'Quick task list',
    icon: CheckSquare,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Checklist' }] },
        { type: 'taskList', content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 1' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 2' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 3' }] }] },
        ]},
      ],
    },
  },
];

interface NoteTemplateGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: Template) => void;
}

export function NoteTemplateGallery({ open, onOpenChange, onSelect }: NoteTemplateGalleryProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <Card
                key={template.id}
                className="p-4 hover:border-primary cursor-pointer transition-colors"
                onClick={() => {
                  onSelect(template);
                  onOpenChange(false);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{template.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {template.description}
                    </p>
                    {template.aiAction && (
                      <p className="text-xs text-primary mt-2">✨ AI-powered</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
