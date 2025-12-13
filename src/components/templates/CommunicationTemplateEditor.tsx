import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VariablePicker } from './VariablePicker';
import { CommunicationTemplate } from '@/hooks/useCommunicationTemplates';
import { Eye, Mail, MessageSquare } from 'lucide-react';

interface CommunicationTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: CommunicationTemplate | null;
  type: 'email' | 'sms' | 'anniversary_email';
  onSave: (template: Partial<CommunicationTemplate>) => void;
  isSaving?: boolean;
}

const sampleData = {
  vendor_first_name: 'Sarah',
  vendor_last_name: 'Mitchell',
  vendor_email: 'sarah@example.com',
  vendor_phone: '021 555 1234',
  property_address: '42 Kauri Road, Ponsonby',
  suburb: 'Ponsonby',
  sale_price: '$1,250,000',
  agent_name: 'Mark Bryant',
  agent_first_name: 'Mark',
  agent_email: 'mark@raywhite.com',
  agent_phone: '021 123 4567',
  settlement_date: '15 March 2024',
  anniversary_date: '15 March 2025',
  years_since_settlement: '1',
  today: new Date().toLocaleDateString('en-NZ'),
  greeting: new Date().getHours() < 12 ? 'Good morning' : 'Good afternoon',
};

const triggerOptions = [
  { value: 'manual', label: 'Manual send only' },
  { value: 'anniversary_1yr', label: '1 Year Anniversary' },
  { value: 'anniversary_2yr', label: '2 Year Anniversary' },
  { value: 'anniversary_5yr', label: '5 Year Anniversary' },
  { value: 'anniversary_10yr', label: '10 Year Anniversary' },
  { value: 'settlement_day', label: 'Settlement Day' },
  { value: 'post_settlement_1wk', label: '1 Week After Settlement' },
];

export function CommunicationTemplateEditor({
  open,
  onOpenChange,
  template,
  type,
  onSave,
  isSaving,
}: CommunicationTemplateEditorProps) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [trigger, setTrigger] = useState('manual');
  const [activeField, setActiveField] = useState<'subject' | 'body'>('body');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setSubject(template.subject_template || '');
      setBody(template.body_template);
      setTrigger(template.trigger_event || 'manual');
    } else {
      setName('');
      setSubject('');
      setBody('');
      setTrigger('manual');
    }
  }, [template, open]);

  const handleInsertVariable = (variable: string) => {
    if (activeField === 'subject') {
      setSubject((prev) => prev + variable);
    } else {
      setBody((prev) => prev + variable);
    }
  };

  const replaceVariables = (text: string) => {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return sampleData[key as keyof typeof sampleData] || match;
    });
  };

  const handleSave = () => {
    onSave({
      name,
      subject_template: type !== 'sms' ? subject : null,
      body_template: body,
      trigger_event: trigger,
      type,
    });
  };

  const isEmail = type === 'email' || type === 'anniversary_email';
  const Icon = isEmail ? Mail : MessageSquare;
  const title = template ? 'Edit Template' : `New ${isEmail ? 'Email' : 'SMS'} Template`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="edit" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 overflow-y-auto space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 1 Year Anniversary Email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger">Auto-send Trigger</Label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[12000]">
                  {triggerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isEmail && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onFocus={() => setActiveField('subject')}
                  placeholder="e.g., Happy Home Anniversary, {{vendor_first_name}}!"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">{isEmail ? 'Email Body' : 'Message'}</Label>
                <VariablePicker onInsert={handleInsertVariable} />
              </div>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => setActiveField('body')}
                placeholder="Write your message here..."
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use {`{{variable}}`} syntax to insert dynamic content
              </p>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-y-auto mt-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              {isEmail && subject && (
                <div className="mb-4 pb-4 border-b">
                  <p className="text-xs text-muted-foreground mb-1">Subject</p>
                  <p className="font-medium">{replaceVariables(subject)}</p>
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm">
                {replaceVariables(body) || (
                  <span className="text-muted-foreground italic">
                    Enter content to see preview...
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Preview using sample data. Actual values will be personalized.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || !body || isSaving}>
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
