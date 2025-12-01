import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Video, ListOrdered, File } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  content: any;
}

const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch with an empty document',
    icon: <File className="h-5 w-5" />,
    content: {
      type: 'doc',
      content: [{ type: 'paragraph' }]
    }
  },
  {
    id: 'sop-standard',
    name: 'SOP (Standard)',
    description: 'Standard operating procedure with sections',
    icon: <FileText className="h-5 w-5" />,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Purpose' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Describe the purpose of this SOP...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Procedure' }] },
        { type: 'orderedList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First step...' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second step...' }] }] },
        ]},
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Resources' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Link to resource...' }] }] },
        ]},
      ]
    }
  },
  {
    id: 'sop-detailed',
    name: 'SOP (Detailed)',
    description: 'Extended SOP with examples and troubleshooting',
    icon: <ListOrdered className="h-5 w-5" />,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Overview' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Brief overview of the process...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Prerequisites' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Required access...' }] }] },
        ]},
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Step-by-Step Instructions' }] },
        { type: 'orderedList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Detailed step...' }] }] },
        ]},
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Examples' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Example scenarios...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Troubleshooting' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Common issue and solution...' }] }] },
        ]},
      ]
    }
  },
  {
    id: 'video-tutorial',
    name: 'Video Tutorial',
    description: 'Video embed with accompanying notes',
    icon: <Video className="h-5 w-5" />,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Video' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '[Paste your Loom, YouTube, or Scribe embed link here]' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Key Takeaways' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Important point from video...' }] }] },
        ]},
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Additional Notes' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Any supplementary information...' }] },
      ]
    }
  },
  {
    id: 'policy',
    name: 'Policy Document',
    description: 'Formal policy with sections',
    icon: <FileText className="h-5 w-5" />,
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Policy Statement' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Main policy statement...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Scope' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Who this policy applies to...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Guidelines' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Guideline...' }] }] },
        ]},
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Exceptions' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Any exceptions to this policy...' }] },
      ]
    }
  },
];

interface CardTemplatesProps {
  onSelect: (template: Template) => void;
}

export function CardTemplates({ onSelect }: CardTemplatesProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {TEMPLATES.map((template) => (
        <Card 
          key={template.id}
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => onSelect(template)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {template.icon}
              </div>
              <div>
                <CardTitle className="text-sm">{template.name}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription className="text-xs">{template.description}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export { TEMPLATES };
export type { Template };
